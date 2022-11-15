import base64
import copy
import hashlib
import json
import logging
from operator import sub
import os
import time
import uuid

from rename import rename as rename_function
from anomaly_detection import AnomalyDetector, sheet_tensor_to_img
from utils import get_rawfile, put_rawfile
import pandas as pd
import mixmasta as mx
import rasterio
import requests

logging.basicConfig()
logging.getLogger().setLevel(logging.INFO)

# Anomaly detector instantiation; load_autoencoder() is comparatively resource intensive.
detector = AnomalyDetector()
detector.load_autoencoder()


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


def build_mapper(uuid, annotations):
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

    import pprint

    # Set default return value (None) for geo_select.
    geo_select = None

    # fp = f"data/{uuid}/annotations.json"
    # with open(fp, "r") as f:
    #     annotations = json.load(f)
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
        sub_ann = annotations[orig_name]
        try:
            sub_ann = sub_ann[0]
        except:
            continue
        for x in sub_ann.keys():
            if x in ["redir_col"]:
                continue

            # Set geo_select if annotated.
            if str(x).lower() == "geo_select_form":
                geo_select = sub_ann[x]
                # Mixmasta expects "admin0" not "country".
                if geo_select.lower() == "country":
                    geo_select = "admin0"

            if x.lower() in conversion_names.keys():
                new_col_name = conversion_names[x.lower()]
            else:
                new_col_name = x.lower()

            if new_col_name != "display_name":
                if new_col_name == "qualifies":
                    if type(sub_ann[x]) == str:
                        sub_ann[x] = [sub_ann[x]]
                if type(sub_ann[x]) == str and new_col_name not in [
                    "is_geo_pair",
                    "qualifies",
                    "dateformat",
                    "time_format",
                    "description",
                ]:
                    entry[new_col_name] = sub_ann[x].lower()
                else:
                    entry[new_col_name] = sub_ann[x]
            else:
                entry[new_col_name] = sub_ann[x]

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


def clear_invalid_qualifiers(uuid, annotations):
    # fp = f"data/{uuid}/annotations.json"
    # with open(fp, "r") as f:
    #     annotations = json.load(f)
    to_del = {}
    for x in annotations.keys():
        sub_ann = annotations[x]
        try:
            logging.info(
                f"Annotation: {annotations} | Annotation Keys: {annotations.keys()} | X: {x} | Annotation x: {sub_ann} | Typeof: {type(sub_ann)} | SUBANN: {sub_ann[0]}"
            )
            sub_ann = sub_ann[0]
            if "qualify" in sub_ann:
                if sub_ann["qualify"] == True:
                    to_del[x] = []
                    if type(sub_ann["qualifyColumn"]) == str:
                        sub_ann["qualifyColumn"] = [sub_ann["qualifyColumn"]]

                    for y in sub_ann["qualifyColumn"]:
                        if y in annotations.keys():
                            if not valid_qualifier_target(annotations[y]):
                                to_del[x].append(y)
                        else:
                            to_del[x].append(y)
        except Exception as e:
            logging.warning(f"Annotation field couldn't be processed: {x}")
    to_drop = []
    for x in to_del.keys():
        for y in to_del[x]:
            annotations[x][0]["qualifyColumn"].remove(y)
        if annotations[x][0]["qualifyColumn"] == []:
            to_drop.append(x)
    for x in to_drop:
        if x in annotations.keys():
            del annotations[x]

    # with open(fp, "w") as f:
    #     json.dump(annotations, f)
    return annotations


def anomaly_detection(context):
    from matplotlib import pyplot as plt
    from io import BytesIO

    uuid = context["uuid"]
    file_stream = get_rawfile(uuid, "raw_data.csv")

    if not os.path.exists(f"./data/{uuid}"):
        os.makedirs(f"./data/{uuid}")

    with open(f"./data/{uuid}/ad_file.csv", "wb") as f:
        f.write(file_stream.read())

    tensor = detector.csv_to_img(f"./data/{uuid}/ad_file.csv")

    result = detector.classify(
        tensor, low_threshold=0.33, high_threshold=0.66, entropy_threshold=0.15
    )
    img = sheet_tensor_to_img(tensor)
    buffer = BytesIO()
    plt.imshow(img)
    plt.savefig(buffer, format="png")
    buffer.seek(0)

    return {
        "anomalyConfidence": result,
        "img": base64.encodebytes(buffer.read()),
    }


def test_job(context, fail=False, sleep=10, *args, **kwargs):
    logging.info(f"test_job preparing to sleep for {sleep} seconds")
    # Test RQ job
    time.sleep(sleep)
    logging.info("test_job sleep completed")
    if fail:
        logging.info("Flag set to force fail, raising exception")
        raise RuntimeError("Forced failure of test job")

    logging.info("test_job task completed successfully")


def model_output_analysis(context, model_id, fileurl, filepath):

    file_key = f"{model_id}:{filepath}"
    file_uuid = str(uuid.UUID(bytes=hashlib.md5(file_key.encode()).digest(), version=4))
    url = f"{os.environ['TERMINAL_ENDPOINT']}{fileurl}"
    req = requests.get(url, stream=True)
    stream = req.raw
    if filepath.endswith('.xlsx') or filepath.endswith('.xls'):
        excel_file = pd.ExcelFile(stream.read())
        return {
            'file_uuid': file_uuid,
            'filetype': 'excel',
            'excel_sheets': excel_file.sheet_names,
            'excel_sheet': excel_file.sheet_names[0]
        }
    elif filepath.endswith('.tiff') or filepath.endswith('.tif'):
        raster = rasterio.open(rasterio.io.MemoryFile(stream))
        return {
            'file_uuid': file_uuid,
            'filetype': 'geotiff',
            'geotiff_band_count': raster.profile['count'],
            'geotiff_band_type': "category",
            'geotiff_bands': {}
        }
    else:
        return {
            'file_uuid': file_uuid
        }


