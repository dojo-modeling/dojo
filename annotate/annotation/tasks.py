import copy
import json
import logging
import os
import time
from .rename import rename as rename_function
from django.apps import apps
from django.conf import settings
from django_rq import job

from mixmasta import mixmasta as mix
from utils.cache_helper import cache_get


# Load GADM3 from gadm app
if settings.CACHE_GADM:
    gadm3 = apps.get_app_config("gadm").gadm3()
    gadm2 = apps.get_app_config("gadm").gadm2()
else:
    gadm3 = None
    gadm2 = None


def dupe(annotations, rename_list, new_names):
    """annotations is a list of dictionaries, if entry["name"] is in rename_list copy over an entry for every name in new_names and rename the entry["name"] to the new name"""
    added = []
    new_list = []
    rename_count = 0
    for entry in annotations:
        # if entry["name"] in primary_geo_renames: # RTK
        if entry["name"] in rename_list:
            # if not primary_geo_renamed: # RTK
            if rename_count < len(rename_list):
                rename_count += 1
                for new_name in new_names:
                    # Don't add again, although duplicates are removed below.
                    if new_name in added:
                        continue
                    e = entry.copy()
                    e["name"] = new_name
                    e["display_name"] = new_name
                    e["type"] = new_name
                    new_list.append(e)
                    added.append(e["name"])
        else:
            if entry["name"] not in added:
                new_list.append(entry)
                added.append(entry["name"])
    return new_list


def build_mapper(uuid):
    """
    Description
    -----------
    Performs two functions:
    (1) Build and return the mixmasta mapper.json from annotations.json.
    (2) Return geo_select if "Geo_Select_Form" is annotated.

    Returns
    -------
        ret: dictionary
            geo, date, and feature keys for mixmasta process.
        geo_select: string, default None
            admin_level if set during annotation: country, admin1, admin2, admin3

    """

    # Set default return value (None) for geo_select.
    geo_select = None

    fp = f"data/{uuid}/annotations.json"
    with open(fp, "r") as f:
        annotations = json.load(f)
    conversion_names = {
        "name": "display_name",
        "geo": "geo_type",
        "time": "date_type",
        "format": "time_format",
        "data_type": "feature_type",
        "unit_description": "units_description",
        "coord_pair_form": "is_geo_pair",
        "qualifycolumn": "qualifies",
        "string": "str",
    }
    ret = {"geo": [], "date": [], "feature": []}

    for orig_name in annotations:
        entry = {}
        entry["name"] = orig_name
        for x in annotations[orig_name].keys():
            if x in ["redir_col"]:
                continue

            # Set geo_select if annotated.
            if str(x).lower() == "geo_select_form":
                geo_select = annotations[orig_name][x]
                # Mixmasta expects "admin0" not "country".
                if geo_select.lower() == "country":
                    geo_select = "admin0"

            if x.lower() in conversion_names.keys():
                new_col_name = conversion_names[x.lower()]
            else:
                new_col_name = x.lower()

            if new_col_name != "display_name":
                if new_col_name == "qualifies":
                    if type(annotations[orig_name][x]) == str:
                        annotations[orig_name][x] = [annotations[orig_name][x]]
                if type(annotations[orig_name][x]) == str and new_col_name not in [
                    "is_geo_pair",
                    "qualifies",
                    "dateformat",
                    "time_format",
                    "description",
                ]:
                    entry[new_col_name] = annotations[orig_name][x].lower()
                else:
                    entry[new_col_name] = annotations[orig_name][x]
            else:
                entry[new_col_name] = annotations[orig_name][x]

        for x in ["dateassociate", "isgeopair", "qualify"]:
            if x in entry.keys():
                del entry[x]

        ret[entry["type"]].append(entry)

    for x in range(len(ret["date"])):
        if "dateformat" in ret["date"][x]:
            ret["date"][x]["time_format"] = ret["date"][x]["dateformat"]
            del ret["date"][x]["dateformat"]

        if ret["date"][x].get("primary_time", False):
            ret["date"][x]["primary_date"] = True
            del ret["date"][x]["primary_time"]

    return ret, geo_select


def valid_qualifier_target(entry):
    k = entry.keys()
    for x in ["qualify", "primary_geo", "primary_time"]:
        if x in k:
            if entry[x] == True:
                return False
    return True


def is_qualifier(entry):
    for x in ["qualify", "qualifies", "qualifyColumn"]:
        if x in entry.keys():
            return True
    return False


def clear_invalid_qualifiers(uuid):
    fp = f"data/{uuid}/annotations.json"
    with open(fp, "r") as f:
        annotations = json.load(f)
    to_del = {}
    for x in annotations.keys():
        if "qualify" in annotations[x].keys():
            if annotations[x]["qualify"] == True:
                to_del[x] = []
                if type(annotations[x]["qualifyColumn"]) == str:
                    annotations[x]["qualifyColumn"] = [annotations[x]["qualifyColumn"]]

                for y in annotations[x]["qualifyColumn"]:
                    if y in annotations.keys():
                        if not valid_qualifier_target(annotations[y]):
                            to_del[x].append(y)
                    else:
                        to_del[x].append(y)
    to_drop = []
    for x in to_del.keys():
        for y in to_del[x]:
            annotations[x]["qualifyColumn"].remove(y)
        if annotations[x]["qualifyColumn"] == []:
            to_drop.append(x)
    for x in to_drop:
        if x in annotations.keys():
            del annotations[x]

    with open(fp, "w") as f:
        json.dump(annotations, f)


def build_meta(uuid, d, geo_select, context):
    fnames = [x.split(".")[0] for x in os.listdir(d)]

    ft = context.get('ft', 'csv')
    fp = context.get('uploaded_file_fp', f'data/{uuid}/raw_data.csv')
    meta = {}
    meta["ftype"] = ft
    
    
    logging.info(f"context is: {context}")
    if ft == "geotiff":
        with open(f"data/{uuid}/geotiff_info.json", "r") as f:
            tif = json.load(f)
        {
            "geotiff_Feature_Name": "feat",
            "geotiff_Band": "1",
            "geotiff_Null_Val": "-9999",
            "geotiff_Date": "",
        }
        if 'bands' in context:
            meta["ftype"] = context.get('ft', 'csv')
            meta["bands"] = context.get('bands', '1')
            meta["null_val"] = context.get('null_val', '-9999')
            meta["date"] = context.get('date', '')
            meta["date"] = context.get('date', '01/01/2001')
            meta["feature_name"] = context.get('Feature_name', tif.get('geotiff_Feature_Name', 'feature'))
            meta['band_name'] = context.get('Feature_name', tif.get('geotiff_Feature_Name', 'feature'))
            meta["band"] = 0
            meta["null_val"] = -9999
            meta["bands"] =context.get('bands', {})
            meta["band_type"] = context.get('band_type', 'category')

        else:
            meta["feature_name"] = tif["geotiff_Feature_Name"]
            meta["band_name"] = tif["geotiff_Feature_Name"]
            meta["null_val"] = tif["geotiff_Null_Val"]
            meta["date"] = tif["geotiff_Date"]

    if ft == "excel":
        xl = json.load(open(f"data/{uuid}/excel_info.json", "r"))
        meta["sheet"] = xl["excel_Sheet"]

    # Update meta with geocode_level if set as geo_select above.
    # If present Mimaxta will override admin param with this value.
    # Meant for use with DMC model runs.
    if geo_select != None:
        meta["geocode_level"] = geo_select
    return meta, fp.split('/')[-1], fp


@job("default", timeout=-1)
def generate_mixmasta_files(context):
    uuid = context["uuid"]
    email = cache_get(uuid, "email", None)
    clear_invalid_qualifiers(uuid)

    # Build the mapper.json annotations, and get geo_select for geo_coding
    # admin level if set annotating lat/lng pairs.
    mixmasta_ready_annotations, geo_select = build_mapper(uuid)

    logging_preface = cache_get(uuid, "logging_preface", None)
    d = f"data/{uuid}"
    fp = ""
    meta = {}
    fn = None

    mixmasta_ready_annotations["meta"], fn, fp = build_meta(uuid, d, geo_select, context)

    logging.info(f"{logging_preface} - Began mixmasta process")

    # BYOM handling
    if context.get("mode") == "byom":
        # Default to admin2 if geo_select is not set or too precise.
        if geo_select in (None, "admin3"):
            admin_level = "admin2"
        else:
            admin_level = geo_select
            logging.info(f"{logging_preface} - set admin_level to {admin_level}")

        byom_annotations = copy.deepcopy(mixmasta_ready_annotations)
        fn = f"{d}/raw_data.csv"
        fp = fn
        byom_annotations["meta"] = {"ftype": "csv"}

        with open(f"data/{uuid}/byom_annotations.json", "w") as f:
            json.dump(
                byom_annotations,
                f,
            )
        mapper = "byom_annotations"

    # BYOD handling
    else:
        # Default to admin3 if geo_select is not set.
        if geo_select == None:
            admin_level = "admin3"
        else:
            admin_level = geo_select
            logging.info(f"{logging_preface} - set admin_level to {admin_level}")

        mapper = "mixmasta_ready_annotations"

    # Set gadm level based on geocoding level; still using gadm2 for gadm0/1.
    with open(f"data/{uuid}/mixmasta_ready_annotations.json", "w") as f:
        json.dump(
            mixmasta_ready_annotations,
            f,
        )

    gadm_level = gadm3 if admin_level == "admin3" else gadm2

    context["gadm_level"] = gadm_level
    context["output_directory"] = d
    context["mapper_fp"] = f"data/{uuid}/{mapper}.json"
    context["raw_data_fp"] = fp
    context["admin_level"] = admin_level

    json.dump(
        mixmasta_ready_annotations,
        open(f"data/{uuid}/sent_to_mixmasta.json", "w"),
    )


def post_mixmasta_annotation_processing(rename, context):
    """change annotations to reflect mixmasta's output"""
    uuid = context["uuid"]
    with open(context["mapper_fp"], "r") as f:
        mixmasta_ready_annotations = json.load(f)
    to_rename = {}
    for k, x in rename.items():
        for y in x:
            to_rename[y] = k

    mixmasta_ready_annotations = rename_function(mixmasta_ready_annotations, to_rename)

    primary_date_renames = [
        x["name"]
        for x in mixmasta_ready_annotations["date"]
        if x.get("primary_geo", False)
    ]
    primary_geo_renames = [
        x["name"]
        for x in mixmasta_ready_annotations["geo"]
        if x.get("primary_geo", False)
    ]

    primary_geo_rename_count = 0  # RTK
    mixmasta_ready_annotations["geo"] = dupe(
        mixmasta_ready_annotations["geo"],
        primary_geo_renames,
        ["admin1", "admin2", "admin3", "country", "lat", "lng"],
    )
    mixmasta_ready_annotations["date"] = dupe(
        mixmasta_ready_annotations["date"], primary_date_renames, ["timestamp"]
    )

    json.dump(
        mixmasta_ready_annotations,
        open(f"data/{uuid}/mixmasta_ready_annotations.json", "w"),
    )
