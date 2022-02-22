# views for our main table overview
from django.shortcuts import render, redirect
import pandas as pd
import os
import json
import copy
import urllib
import logging
from utils.cache_helper import cache_get, cache_set, save_cache, load_cache
from itertools import islice
from django.views import View


def get_row_count(input):
    """
    Decription
    ----------
    Supposedly fast method to get the row count of raw_data.csv so the
    total entry count can be reported in Instructions.

    Performance
    -----------
    ~ 1.3 sec to count 6,470,400 lines (~351MB csv file)
    """
    with open(input, "r") as f:
        row_count = 0
        while True:
            l = len(list(islice(f, 100)))

            if l == 0:
                break
            else:
                row_count += l
        return row_count - 1  # subtract header


def get_annotations(fp, cols=None):
    """return annotations for a given fp"""
    try:
        with open(fp, "r") as f:
            annotations = json.load(f)
    except:
        annotations = {}
        with open(fp, "w") as f:
            json.dump(annotations, f)
    to_del = []
    if cols is not None:
        for k in annotations:
            if k not in cols:
                to_del.append(k)
    for k in to_del:
        del annotations[k]
        with open(fp, "w") as f:
            json.dump(annotations, f)
    return annotations


def get_df(uuid):
    """
    Returns
    -------
        dataframe: df of random sample of 10,000 rows.
        int: row count of raw_data.csv
    """
    df = pd.read_csv(f"data/{uuid}/raw_data.csv", nrows=10000).sample(frac=1)
    df = df[:100]

    row_count = get_row_count(f"data/{uuid}/raw_data.csv")

    # Save this sample; for BYOM we should just use this
    df.to_csv(f"data/{uuid}/raw_data_byom_sample.csv", index=False)
    return df, row_count


def to_annotate_button(uuid, btn_text, col_name):
    """button for column that has not been annotated"""
    col_name = urllib.parse.quote(col_name)
    btn_class = "btn btn-outline-secondary"
    btn = f"""<button class="{btn_class}" onclick="window.location.href='annotate/{uuid}?col={col_name}'">{btn_text}</button>"""
    return btn


def annotated_button(uuid, btn_text, col_name):
    """button for column that has been annotated"""
    col_name = urllib.parse.quote(col_name)
    btn_class = "btn btn-outline-success"
    btn = f"""<button class="{btn_class}" onclick="window.location.href='annotate/{uuid}?col={col_name}'">{btn_text}</button>"""
    return btn


def clear_post_submissio_artifacts(uuid):
    """delete all files created after table submission to allow the processors to rerun and not trigger the
    is_done function of the processors"""
    to_del = ["finished", "mixmasta_processed_df.csv"]
    for f in os.listdir(f"data/{uuid}"):
        if f in to_del:
            os.remove(f"data/{uuid}/{f}")


class Table(View):
    def get(self, request, *args, **kwargs):
        """get request for table view"""
        uuid = kwargs.get("uuid")
        clear_post_submissio_artifacts(uuid)
        # Get sample df and the row_count of the entire raw_data.csv
        df, df_row_count = get_df(uuid)
        annotations = get_annotations(f"data/{uuid}/annotations.json", cols = df.columns)
        logging_preface = cache_get(uuid, "logging_preface", None)
        context = {}

        annotated_cols = list(annotations.keys())

        if request.GET.get("reedit", False):
            load_cache(uuid)

        logging.info(f"{logging_preface} - In overall table view")

        

        # df_count is used in table_view.html to display total number of entries.
        context["df_count"] = format(df_row_count, ",d")

        btns = {}

        # get the index of each annotated column so we can color code it
        context["annotated_idx"] = []
        gc_annotated_cols = copy.deepcopy(annotated_cols)

        for count, col in enumerate(df.columns):
            if col not in annotated_cols:
                btn = to_annotate_button(str(uuid), "Annotate", col)
            else:
                btn = annotated_button(str(uuid), "Edit", col)
            btns[col] = f"{btn} <br> <br> {col}"

        # annotated cols first
        col_order = annotated_cols
        num_annotated_cols = len(annotated_cols)
        for col in df.columns:
            if col not in annotated_cols:
                col_order.append(col)

        df = df[col_order]
        logging.info(annotated_cols)

        for x in range(num_annotated_cols):
            context["annotated_idx"].append(x)
        logging.warn(context["annotated_idx"])

        # get geotime classify annotations
        # if geotime classify has a category for the column AND it has not yet been annotated
        # let's give it a color!
        with open(f"data/{uuid}/geotime_classification.json", "r") as f:
            gc = json.load(f)
        context["geotime_idx"] = []

        # TODO snufff out timeouts being classified
        for count, col in enumerate(df.columns):
            if col in gc.keys():
                if gc[col].get("category", None) != None:
                    if col not in gc_annotated_cols:
                        if count < 100:
                            context["geotime_idx"].append(count)

        df = df.rename(columns=btns)
        html_df = df.to_html(escape=False, index=False)
        context["df"] = html_df

        context["preview_count"] = len(df)
        return render(request, "annotation/table_view.html", context)

    @staticmethod
    def clear_table(uuid):
        """clear all table annotations"""
        logging_preface = cache_get(uuid, "logging_preface", None)
        logging.info(f"{logging_preface} - Cleared all annotations")
        annotations = {}
        with open(f"data/{uuid}/annotations.json", "w") as f:
            json.dump(annotations, f)
        fields = [
            "primary_country",
            "primary_admin1",
            "primary_admin2",
            "primary_admin3",
            "primary_time_set",
        ]
        for f in fields:
            cache_set(uuid, f, False)
        return True

    @staticmethod
    def submit(uuid):
        """submit table save cache and redir to the post processing step"""
        save_cache(uuid)
        logging_preface = cache_get(uuid, "logging_preface", None)
        logging.info(f"{logging_preface} - Submitted annotations")
        return redirect(f"transform_loading/{uuid}")

    def post(self, request, *args, **kwargs):
        """post handling for table, clear or submit"""
        uuid = kwargs.get("uuid")

        if request.POST.get("Clear", False):
            self.clear_table(uuid)

        if request.POST.get("Submit", False):
            self.submit(uuid)
            return redirect(f"transform_loading/{uuid}")
        return self.get(request, *args, **kwargs)
