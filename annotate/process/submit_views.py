import os
import json
import logging
import time
import copy

import boto3
import numpy as np
import pandas as pd
import requests
from django.apps import apps
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.generic import View

from mixmasta import mixmasta as mix
from tasks.views import TaskView, TaskStatusView
from utils.cache_helper import cache_get, cache_set

"""def build_meta(fp):
	sheet = json.load(open(fp + '/excel_info.json'))['excel_Sheet']
	return {'ftype' : 'csv', 'sheet':sheet}"""


# Load GADM3 from gadm app
if settings.CACHE_GADM:
    gadm3 = apps.get_app_config("gadm").gadm3()
    gadm2 = apps.get_app_config("gadm").gadm2()
else:
    gadm3 = None
    gadm2 = None


def split_on_wild_card(s):
    if s.find("*") == -1:
        if s.find("/") == -1:
            return "", s
        t = s.split("/")
        return "/".join(t[:-1]), t[-1]

    parent = []
    children = []
    flag = False
    for x in s.split("/"):
        if x.find("*") != -1:
            flag = True
        if flag:
            children.append(x)
        else:
            parent.append(x)

    if flag == False:
        children = [parent[-1]]
        del parent[-1]

    if len(parent) > 1:
        parent = "/".join(parent)
    else:
        if len(parent) == 0:
            parent = "/"
        else:
            parent = parent[0]

    if len(children) > 1:
        children = "/".join(children)
    else:
        children = children[0]

    return parent, children


def model_patch(uuid, auth):
    url = f"""{settings.DOJO_URL}/models/{cache_get(uuid, 'model_id')}"""
    response = None
    if auth:
        response = requests.get(
            url, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD)
        ).json()
    else:
        response = requests.get(url).json()

    if isinstance(response.get('outputs'), list) in response:
        response['outputs'] = [x for x in response['outputs'] if x.get('uuid', False) != uuid]
    if isinstance(response.get('qualifier_outputs'), list) :
        response['qualifier_outputs'] = [x for x in response['qualifier_outputs'] if x.get('uuid', False) != uuid]

    di = json.load(open(f'data/{uuid}/dojo_submit.json', "r"))
    for x in ["outputs", "qualifier_outputs"]:
        for y in range(len(di[x])):
            entry = di[x][y]
            entry["ontologies"] = {
                "concepts": [{"name": "string", "score": 0}],
                "processes": [{"name": "string", "score": 0}],
                "properties": [{"name": "string", "score": 0}],
            }
            di[x][y] = entry
            di[x][y]['uuid'] = uuid

    di_names = [x["name"] for x in di["outputs"]]
    outputs = di.get("outputs", [])
    for x in response.get("outputs", []):
        if x["name"] in di_names:
            continue
        outputs.append(x)

    response["outputs"] = outputs

    di_names = [x["name"] for x in di["qualifier_outputs"]]
    q_outputs = di.get("qualifier_outputs", [])
    if response["qualifier_outputs"]:
        for x in response.get("qualifier_outputs", []):
            if x["name"] in di_names:
                continue
            q_outputs.append(x)
    response["qualifier_outputs"] = q_outputs

    res, r = {}, None
    url = f"""{settings.DOJO_URL}/models"""

    if auth:
        r = requests.post(
            url,
            json=response,
            auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD),
        )

        res["url"] = url
        res["input"] = response
        try:
            res["response"] = r.json()
        except:
            res["response"] = r.text
        return JsonResponse(res), r
    else:
        r = requests.post(url, json=response)
        try:
            res["response"] = r.json()
        except:
            res["response"] = r.text
        res["url"] = url
        res["input"] = response

        return JsonResponse(res), r


def output_file_push(uuid, auth):
    url = f"""{settings.DOJO_URL}/dojo/outputfile"""

    submit = {}
    submit["id"] = uuid
    submit["model_id"] = cache_get(uuid, "model_id")
    submit["transform"] = json.load(open(f'data/{uuid}/sent_to_mixmasta.json', "r"))

    file_info = json.load(open(f'data/{uuid}/dataset_info.json', "r"))
    submit["name"] = file_info["dataset_Name"]

    fn = cache_get(uuid, "full_file_path")
    ft = "csv"
    converter = {
        ".xlsx": "excel",
        "netcdf": ".cdf",
        ".tif": "geotiff",
        ".tiff": "geotiff",
    }
    for x in converter.keys():
        if fn.endswith(x):
            ft = converter[x]

    submit["file_type"] = ft

    p, c = split_on_wild_card(fn)
    submit["path"] = c
    submit["output_directory"] = p
    submit["id"] = uuid
    submit = [submit]
    res, r = None, None
    if auth:
        r = requests.post(
            url, json=submit, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD)
        )
        res["input"] = submit
        try:
            res["response"] = r.json()
        except:
            res["response"] = r.text

        return JsonResponse(res), r
    else:
        r = requests.post(url, json=submit)
        res = {}
        res["input"] = submit
        try:
            res["response"] = r.json()
        except:
            res["response"] = r.text
        return JsonResponse(res), r

def output_file_delete(uuid):
    #delete by annotate uuid because it is a reedit
    #url =f'endpoint/{uuid}'
    pass

def byom_submit(request, uuid, auth=False):
    s = True
    res, r = model_patch(uuid, auth)

    # if request.session.get('reedit', False):
    #     output_file_delete(request)

    if not (r.status_code < 300 and r.status_code >= 200):
        return res

    try:
        res, r = output_file_push(uuid, auth)

        if not (r.status_code < 300 and r.status_code >= 200):
            return res

        logging.info(
            f"{cache_get(uuid, 'logging_preface', None)} - BYOM successfully uploaded"
        )
        return render(request, "process/success_page.html", {"byom": True})
    except Exception as e:
        logging.info(
            f"{cache_get(uuid, 'logging_preface', None)} - encountered error {e}; unable to load model output file."
        )
        return render(request, "process/error_outputfile.html")


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


def submit_table(request, uuid, context={}):
    # Fetch ret dataframe from file
    ret = pd.read_csv(f"data/{uuid}/mixmasta_processed_df.csv")

    # If the dataset is larger than 100 rows, just sample 100 rows to show as the preview
    # else we will crash the browser.
    # preview_count and df_count are passed to inform user of true size of dataset.
    ret_sample = ret
    if len(ret) > 100:
        ret_sample = ret.sample(100)
        context["preview_count"] = 100
    else:
        context["preview_count"] = len(ret)

    context["df"] = ret_sample.to_html(escape=False, index=False)
    context["uuid"] = uuid

    context["df_count"] = format(len(ret), ',d')

    return render(request, "process/preview.html", context)


def is_primary(entry):
    if "primary_date" in entry.keys():
        if entry["primary_date"] == True:
            return True

    if "primary_geo" in entry.keys():
        if entry["primary_geo"] == True:
            return True
    return False


def is_feature(entry):
    return not is_primary(entry) and not is_qualifier(entry)


def tag_type(k):
    entry = {}
    if k["type"] == "geo":
        if k["geo_type"].lower() not in [
            "latitude",
            "longitude",
            "country",
            "admin1",
            "admin2",
            "admin3",
        ]:
            entry["type"] = "str"
            entry["unit"] = k["geo_type"]
        else:
            if k["geo_type"].lower() == "latitude":
                entry["type"] = "lat"
            elif k["geo_type"].lower() == "longitude":
                entry["type"] = "lng"
            else:
                entry["type"] = k["geo_type"].lower()
            entry["unit"] = k["geo_type"]

    if k["type"] == "feature":
        entry["type"] = k["feature_type"]

    return entry


def push_file(fname, new_name):
    session = boto3.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY ,
    )

    s3 = session.resource("s3")
    s3_client = session.client("s3")

    s3_client.upload_file(
        fname,
        settings.ANNOTATION_S3_BUCKET,
        new_name,  # here we specify the key we wish the file to have in S3
        ExtraArgs={"ACL": "public-read"},
    )

    return f'https://{settings.ANNOTATION_S3_BUCKET}.s3.amazonaws.com/{new_name}'


def push_all_files(uuid):
    raw_data = f"data/{uuid}/raw_data.csv"
    mapper = f"data/{uuid}/annotations.json"
    maintainer = f"data/{uuid}/maintainer_info.json"
    submit = f"data/{uuid}/dojo_submit.json"
    parquets = [
        f"data/{uuid}/{x}"
        for x in os.listdir(f"data/{uuid}")
        if x.find(".parquet") != -1
    ]
    # If we are in the model output workflow there is no maintainer information:
    if cache_get(uuid, "byom", None) != None:
        logging.debug(f"In model submission workflow, no maintainer information available")
        files = [raw_data, mapper, submit]
    else:
        files = [raw_data, mapper, maintainer, submit]

    s3_path = settings.ANNOTATION_S3_PATH

    ret_files = []
    for file in files:
        nfp = file.replace("data/", "")
        try:
            push_file(file, f"{s3_path}/{nfp}")
        except Exception as e:
            logging.error(f"Issue pushing {file} to S3: {e}")

    for x in parquets:
        nfp = x.replace("data/", "")
        ret_files.append(push_file(x, f"{s3_path}/{nfp}"))

    return ret_files


def dojo_submit(request, uuid, context={}):
    email = cache_get(uuid, "email", None)

    df = pd.read_csv(f"data/{uuid}/mixmasta_processed_df.csv")
    submit = {}
    geos_unique = {}

    dataset_info = json.load(open(f"data/{uuid}/dataset_info.json", "r"))
    try:
        maintainer = json.load(open(f"data/{uuid}/maintainer_info.json", "r"))
    except:
        maintainer = {}
    submit["geography"] = {}
    annotations = json.load(open(f"data/{uuid}/mixmasta_ready_annotations.json", "r"))
    del annotations["meta"]
    submit["geography"]["country"] = [
        x for x in df[df["country"].notna()]["country"].unique() if x != "nan"
    ]

    # If there are more than 10 countries in the geography then we should not include admin1 - 3
    # the rationale for that is it may be a global or regional dataset and the number of admin1's, admin2's and admin3's
    # will bloat the Dojo submission object (e.g. potentially thousands of items in admin3, etc)
    if len(submit["geography"]["country"]) < 10:
        for x in ["admin1", "admin2", "admin3"]:
            submit["geography"][x] = [
                x for x in df[df[x].notna()][x].unique() if x != "nan"
            ]
    else:
        logging.info(f"{cache_get(uuid, 'logging_preface', None)} - Dataset has >=10 countries, skipping adding Geography")
        submit["geography"]["admin1"] = []
        submit["geography"]["admin2"] = []
        submit["geography"]["admin3"] = []

    submit["id"] = uuid
    submit["name"] = dataset_info["dataset_Name"]
    submit["description"] = dataset_info["dataset_Description"]
    submit["category"] = dataset_info["dataset_Category"]
    submit["tags"] = dataset_info["dataset_Category"]
    submit["maintainer"] = {}
    entries = []
    feature_names = []
    conversions = {
        "date_type": "unit",
        "units": "unit",
        "units_description": "unit_description",
    }

    for t in annotations.keys():
        for k in annotations[t]:
            if is_feature(k):
                entry = {}
                feature_names.append(k["name"])
                for x in ["name", "display_name", "description", "type"]:
                    if x in k.keys():
                        entry[x] = k[x]

                for x in conversions.keys():
                    if x in k.keys():
                        entry[conversions[x]] = k[x]

                r = tag_type(k)

                for x in r.keys():
                    entry[x] = r[x]

                if entry == {}:
                    continue
                entry["is_primary"] = True
                entry["ontologies"] = {}
                if entry["type"] == "binary":
                    entry["type"] = "boolean"
                entries.append(entry)

    for x in range(len(entries)):
        if entries[x]["type"] == "date":
            entries[x]["type"] = "datetime"
        if entries[x]["type"] == "string":
            entries[x]["type"] = "str"
        if entries[x]["type"] == "binary":
            entries[x]["type"] = "boolean"
        if "units" in entries[x].keys():
            entries[x]["unit"] = entries[x]["units"]
            del entries[x]["units"]
        if "units description" in entries[x].keys():
            entries[x]["unit description"] = entries[x]["units description"]
            del entries[x]["units description"]

    ## tag with data _resolution
    r = json.load(open(f'data/{uuid}/resolution_info.json', "r"))

    # Only tag with spatial resolution if it was specified.
    if r.get("resolution_spatial_x", "") == "":
        resolution = {"temporal_resolution": r["resolution_temporal"]}
    else:
        resolution = {
            "spatial_resolution": [
                float(r["resolution_spatial_x"]),
                float(r["resolution_spatial_y"]),
            ],
            "temporal_resolution": r["resolution_temporal"],
        }
    new_outputs = []

    for x in entries:
        x["data_resolution"] = resolution
        x['uuid'] = uuid
        new_outputs.append(x)

    submit["outputs"] = new_outputs

    ##

    entries = []
    for t in annotations.keys():
        for k in annotations[t]:
            entry = {}
            if is_primary(k):
                for x in ["name", "display_name", "description", "type"]:
                    if x in k.keys():
                        entry[x] = k[x]
                    for x in conversions.keys():
                        if x in k.keys():
                            entry[conversions[x]] = k[x]
                entry["related_features"] = feature_names

            if is_qualifier(k):
                for x in ["name", "display_name", "description", "type"]:
                    if x in k.keys():
                        entry[x] = k[x]
                    for x in conversions.keys():
                        if x in k.keys():
                            entry[conversions[x]] = k[x]
                entry["related_features"] = k["qualifies"]
            if entry == {}:
                continue
            r = tag_type(k)

            for x in r.keys():
                entry[x] = r[x]
            entry["ontologies"] = {}
            entries.append(entry)

    for x in range(len(entries)):
        if entries[x]["type"] == "date":
            entries[x]["type"] = "datetime"
        if entries[x]["type"] == "string":
            entries[x]["type"] = "str"
        if entries[x]["type"] == "binary":
            entries[x]["type"] = "boolean"
        if "units" in entries[x].keys():
            entries[x]["unit"] = entries[x]["units"]
            del entries[x]["units"]
        if "units description" in entries[x].keys():
            entries[x]["unit description"] = entries[x]["units description"]
            del entries[x]["units description"]
        entries[x]['uuid'] = uuid

    submit["qualifier_outputs"] = entries

    for x in maintainer.keys():
        if maintainer[x] not in [None, "", " "]:
            submit["maintainer"][x.replace("maintainer_", "").lower()] = maintainer[x]
    s3_path = settings.ANNOTATION_S3_PATH
    if not df.timestamp.isnull().all():
        submit["period"] = {
            "gte": int(min(df.timestamp)),
            "lte": int(max(df.timestamp)),
        }
    context["dojo_url"] = f"{settings.DOJO_URL}/indicators/{uuid}"
    json.dump(submit, open(f"data/{uuid}/dojo_submit.json", "w"))

    # If we are in the model output workflow:
    if cache_get(uuid, "byom", None) != None:
        logging.info(f"{cache_get(uuid, 'logging_preface', None)} - In model output submission flow.")
        if settings.DOJO_USERNAME:
            return byom_submit(request, uuid, auth=True)
        else:
            return byom_submit(request, uuid, auth=False)

    # If we are in the data registration workflow:
    else:
        logging.info(f"{cache_get(uuid, 'logging_preface', None)} - In data submission flow.")
        submit["data_paths"] = push_all_files(uuid)
        if settings.DOJO_USERNAME:
            r = requests.post(
                f'{settings.DOJO_URL}/indicators',
                json=submit,
                auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD),
            )
        else:
            r = requests.post(f'{settings.DOJO_URL}/indicators', json=submit)

        if r.status_code > 300:
            logging.fatal(r.text)
            return render(request, "process/error.html", context)
        else:
            logging.info(
                f"{cache_get(uuid, 'logging_preface', None)} - BYOD successfully pushed to dojo indicators"
            )

        return render(request, "process/success_page.html", context)


class PreviewLoader(TaskView):
    from .tasks import process_preview

    task_function = process_preview
    task_status_url = "status?job_id={job_id}"
    task_name = "preview"
    completion_url = "../../../overview/submit/{uuid}"


class PreviewStatus(TaskStatusView):
    def is_done(self, request, uuid):
        done = bool(
            os.path.exists(f"data/{uuid}/mixmasta_processed_df.csv")
            and not
            os.path.exists(f"data/{uuid}/mixmasta_processed_writing")
        )
        return done
