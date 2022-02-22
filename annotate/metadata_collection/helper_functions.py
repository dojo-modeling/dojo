import json
import logging
import os
from pathlib import Path
import uuid as uuid_module

from django.conf import settings
from django.core.cache import cache
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse, HttpResponse, Http404, FileResponse
from django.shortcuts import render, redirect
from django.views import View
import pandas as pd
import requests

from geotime_classify import geotime_classify as gc
from mixmasta import mixmasta as mix
from utils.cache_helper import cache_get, cache_set


DOMAIN_CACHE_KEY = "dojo-domain-list"
DOMAIN_CACHE_TIMEOUT = 3600 # 1 hour

def get_domains():
    # Domains are cached to prevent too many hits on a resource that is unlikely to change much.
    domains = cache.get(DOMAIN_CACHE_KEY)
    if domains is not None:
        return domains
    try:
        req = requests.get(f"{settings.DOJO_URL}/dojo/domains")
        domains = req.json()
        cache.set(DOMAIN_CACHE_KEY, domains, DOMAIN_CACHE_TIMEOUT)
    except Exception as err:
        logging.error(err)
    return domains


def save_file(request, context={}):
    uploaded_file = request.FILES["filename"]
    fs = FileSystemStorage()
    ftypes = {
        ".xls": "raw_excel.xlsx",
        ".xlsx": "raw_excel.xlsx",
        ".csv": "raw_csv.csv",
        ".tif": "raw_tiff.tiff",
        ".tiff": "raw_tiff.tiff",
        ".nc": "raw_cdf.nc",
    }

    for k, v in ftypes.items():
        if uploaded_file.name.lower().endswith(k):
            raw_file_name = v
            break
    else:
        raise ValueError(
            f"File extension for file named '{uploaded_file}' does not match any recognized extensions: {', '.join(key for key in ftypes)}"
        )

    output_file = f"{context['parent_folder']}/{context['uuid']}/{raw_file_name}"

    for x in "data", f"{context['parent_folder']}/{context['uuid']}":
        # make sure data folder exists, if not create it
        if not os.path.exists(x):
            os.mkdir(x)

    fs.save(output_file, uploaded_file)

    context["uploaded_file_fp"] = output_file

    return output_file


def init_cache_set(context={}):
    cache_values = {
        "limit_annotation_alert": False,
        "primary_time_set": False,
        "primary_country_set": False,
        "primary_admin1_set": False,
        "primary_admin2_set": False,
        "primary_admin3_set": False,
        "primary_coord_set": False,
        "logging_preface": context["logging_preface"],
    }

    uuid = context["uuid"]
    for key, value in cache_values.items():
        cache_set(uuid, key, value)


def create_folder(uuid):
    if "data" not in os.listdir():
        os.mkdir("data")
    if str(uuid) not in os.listdir("data"):
        os.mkdir(f"data/{uuid}")
    return


def download_csv(request, uuid):
    file_path = f"data/{uuid}/mixmasta_processed_df.csv"
    logging.info(f"Downloading transformed CSV: {file_path}")
    if os.path.exists(file_path):
        with open(file_path, "rb") as fh:
            response = HttpResponse(fh.read(), content_type="application/csv")
            response["Content-Disposition"] = f"inline; filename={uuid}.csv"
            return response
    raise Http404
