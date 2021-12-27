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
    with open(input, 'r') as f:
        row_count = 0
        while True:
            l = len(list(islice(f, 100)))

            if l == 0:
                break
            else:
                row_count += l
        return row_count - 1 # subtract header
      

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


def get_annotations(uuid):
    if "annotations.json" in os.listdir(f"data/{uuid}"):
        annotations = json.load(open(f"data/{uuid}/annotations.json", "r"))
    else:
        annotations = {}
    return annotations


def to_annotate_button(uuid, btn_text, col_name):
    col_name = urllib.parse.quote(col_name)
    btn_class = "btn btn-outline-secondary"
    btn = f"""<button class="{btn_class}" onclick="window.location.href='annotate/{uuid}?col={col_name}'">{btn_text}</button>"""
    return btn


def annotated_button(uuid, btn_text, col_name):
    col_name = urllib.parse.quote(col_name)
    btn_class = "btn btn-outline-success"
    btn = f"""<button class="{btn_class}" onclick="window.location.href='annotate/{uuid}?col={col_name}'">{btn_text}</button>"""
    return btn



def review_table(request, uuid, context={}):
    if request.GET.get('reedit', False):
        load_cache(uuid)
    email = cache_get(uuid, "email", None)
    logging_preface = cache_get(uuid, 'logging_preface', None)
 
    logging.info(f"{logging_preface} - In overall table view")

    if request.POST:
        if "Clear" in request.POST:
            logging.info(f"{logging_preface} - Cleared all annotations")
            annotations = {}
            json.dump(annotations, open(f"data/{uuid}/annotations.json", "w"))
            cache_set(uuid, "primary_country", False)
            cache_set(uuid, "primary_admin1", False)
            cache_set(uuid, "primary_admin2", False)
            cache_set(uuid, "primary_admin3", False)
            cache_set(uuid, "primary_time_set", False)
        else:
            if "Submit" in request.POST:
                save_cache(uuid)
                logging.info(f"{logging_preface} - Submitted annotations")
                return redirect(f"transform_loading/{uuid}")

    annotations = get_annotations(uuid)
    annotated_cols = list(annotations.keys())

    # Get sample df and the row_count of the entire raw_data.csv
    df, df_row_count = get_df(uuid)

    # df_count is used in table_view.html to display total number of entries.
    context["df_count"] = format(df_row_count, ',d')

    btns = {}

    # get the index of each annotated column so we can color code it
    context["annotated_idx"] = []
    count = 0
    gc_annotated_cols = copy.deepcopy(annotated_cols)
    for col in df.columns:
        if col not in annotated_cols:
            btn = to_annotate_button(str(uuid), "Annotate", col)
        else:
            btn = annotated_button(str(uuid), "Edit", col)
            context["annotated_idx"].append(count)
            count += 1

        btns[col] = f"{btn} <br> <br> {col}"

    col_order = annotated_cols
    for col in df.columns:
        if col not in annotated_cols:
            col_order.append(col)
    df = df[col_order]

    # get geotime classify annotations
    # if geotime classify has a category for the column AND it has not yet been annotated
    # let's give it a color!
    gc = json.load(open(f"data/{uuid}/geotime_classification.json", "r"))
    context["geotime_idx"] = []
    count = 0
    for col in df.columns:
        if col in gc.keys():
            if gc[col].get("category", None) != None:
                if col not in gc_annotated_cols:
                    if count < 100:
                        context["geotime_idx"].append(count)
        count += 1

    df = df.rename(columns=btns)
    html_df = df.to_html(escape=False, index=False)
    context["df"] = html_df

    context["preview_count"] = len(df)
    return render(request, "process/table_view.html", context)
