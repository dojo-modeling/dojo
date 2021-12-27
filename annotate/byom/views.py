import json
import logging
import os
from pathlib import Path
import uuid as uuid_module

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse, HttpResponse, Http404, FileResponse
from django.shortcuts import render, redirect
from django.views import View
import pandas as pd
import requests

from conversions.conversion_forms import geotiff_form, excel_form
from conversions.conversions import (
    capture_geotiff_info,
    convert_save_tiff,
    convert_save_excel,
    convert_save_cdf,
    gen_samples,
)
from geotime_classify import geotime_classify as gc
from mixmasta import mixmasta as mix
from utils.cache_helper import cache_get, cache_set


os.environ["KMP_DUPLICATE_LIB_OK"] = "True"


def create_folder(uuid):
    if "data" not in os.listdir():
        os.mkdir("data")
    if str(uuid) not in os.listdir("data"):
        os.mkdir(f"data/{uuid}")
    return


def capture_data(request, uuid, identifier, output_filename):
    body = request.POST
    to_write = {}

    for x in body.keys():
        if x.lower().find(f"{identifier}") == -1:
            continue
        else:
            if x.lower().find("category") != -1:
                to_write[x] = [x.strip() for x in body[x].split(",")]
            else:
                to_write[x] = body[x]

    json.dump(
        to_write, open(f"data/{uuid}/{output_filename}.json", "w")
    )
    return


def download_file(url, local_filename):
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        logging.info(r.text)
        with open(local_filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return local_filename


def hit_dojo(uuid, reqid):
    url = f'{settings.DOJO_URL}/terminal/file/{reqid}'
    r = None
    if settings.DOJO_USERNAME:
        r = requests.get(url, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD))
    else:
        r = requests.get(url)

    response = r.json()
    converter = {
        ".csv": "raw_data.csv",
        ".xlsx": "raw_excel.xlsx",
        ".nc": "raw_cdf.nc",
        ".tif": "raw_tiff.tif",
        ".tiff": "raw_tiff.tiff",
    }
    fp = Path(response["file_path"])
    model_id = response["model_id"]
    fn = converter[fp.suffix]
    url = f'{settings.TERMINAL_API_ENDPOINT}{response["request_path"]}'

    download_file(url, f"data/{uuid}/{fn}")

    url = f'{settings.DOJO_URL}/models/{model_id}'
    if settings.DOJO_USERNAME:
        r = requests.get(url, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD))
    else:
        r = requests.get(url)

    email = r.json().get("maintainer", {}).get("email", None)
    return response["file_path"], response["model_id"], fn, email


def save_data_file(request, uuid, uploaded_file):
    cache_set(uuid, "uploaded_file", uploaded_file)

    for ext in ["xls", "xlsx"]:
        if "excel_Sheet" in request.POST:
            sheet = request.POST["excel_Sheet"]
        else:
            sheet = None

        if uploaded_file.endswith(ext):
            fs = FileSystemStorage()
            if sheet == None or sheet == "":
                convert_save_excel(uploaded_file, uuid)
            else:
                convert_save_excel(f"data/{uuid}/{uploaded_file}", uuid, sheet)
            return

    if uploaded_file.endswith(".nc"):
        return

    if uploaded_file.endswith(".csv"):
        return

    for ext in ["tiff", "tif"]:
        if uploaded_file.endswith(ext):
            convert_save_tiff(f"data/{uuid}/raw_tiff.{ext}", request, uuid)
            return


# Create your views here.
class SplashView(View):
    def get(self, request):
        uuid = str(uuid_module.uuid4())
        context = {}

        cache_set(uuid, "byom", True)
        context["geotiff_Form"] = geotiff_form()
        context["excel_Form"] = excel_form()
        context["uuid"] = uuid
        create_folder(uuid)

        try:
            (full_file_path, model_id, fn, email) = hit_dojo(uuid, request.GET.get("reqid", ""))
        except Exception as e:
            return render(request, "byom/error.html", context)

        cache_set(uuid, "full_file_path", full_file_path)
        cache_set(uuid, "model_id", model_id)
        cache_set(uuid, "fp", fn)
        cache_set(uuid, "email", email)

        context["fp"] = full_file_path
        context["local_fp"] = fn
        return render(request, "byom/byom.html", context)

    def post(self, request):
        uuid = request.POST['uuid']

        logging.warning(f"uuid: {uuid}")

        for x in ["primary_time_set", "limit_annotation_alert", "primary_country_set", "primary_admin1_set",
                  "primary_admin2_set", "primary_admin3_set", "primary_coord_set"]:
            cache_set(uuid, x, False)

        logging_preface = f"{uuid} {cache_get(uuid, 'email', None)} - BYOM User"
        cache_set(uuid, "logging_preface", logging_preface)

        capture_data(request, uuid, "excel", "excel_info")
        capture_data(request, uuid, "geotiff", "geotiff_info")
        capture_data(request, uuid, "dataset", "dataset_info")
        capture_data(request, uuid, "resolution", "resolution_info")
        cache_set(uuid, "full_file_path", request.POST["filename"])

        save_data_file(request, uuid, cache_get(uuid, "fp"))
        logging.info(f"{logging_preface} - BYOM successfully posted info page")

        return redirect(f"./analyze/{uuid}")
