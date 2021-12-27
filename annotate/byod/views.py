import json
import uuid as uuid_module
import pandas as pd
import logging
import sys, os

from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse, HttpResponse, Http404, FileResponse
from django.shortcuts import render, redirect
from django.views import View
from geotime_classify import geotime_classify as gc

from conversions.conversion_forms import geotiff_form, excel_form
from conversions.conversions import (
    capture_geotiff_info,
    convert_save_tiff,
    convert_save_excel,
    convert_save_cdf,
    gen_samples,
)
from mixmasta import mixmasta as mix
from tasks.views import TaskView, TaskStatusView
from utils.cache_helper import cache_get, cache_set

# Create your views here.
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


def capture_base_data(request, uuid, output_filename):
    body = request.POST
    to_write = {}

    for x in body.keys():
        if x.lower() not in ["name", "category", "description"]:
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


def save_data_file(request, uuid):
    uploaded_file = request.FILES["filename"]
    cache_set(uuid, 'uploaded_file', uploaded_file.name)

    for ext in ["xls", "xlsx"]:
        if "excel_Sheet" in request.POST:
            sheet = request.POST["excel_Sheet"]
        else:
            sheet = None

        if uploaded_file.name.endswith(ext):
            fs = FileSystemStorage()
            fs.save(f"data/{uuid}/raw_excel.{ext}", uploaded_file)
            if sheet == None or sheet == "":
                df = convert_save_excel(uploaded_file, uuid)
            else:
                df = convert_save_excel(uploaded_file, uuid, sheet)
            gen_samples(uuid, df)
            return

    if uploaded_file.name.endswith(".nc"):
        fs = FileSystemStorage()
        fs.save(f"data/{uuid}/raw_cdf.nc", uploaded_file)
        return

    if uploaded_file.name.endswith(".csv"):
        fs = FileSystemStorage()
        name = fs.save(f"data/{uuid}/raw_data.csv", uploaded_file)
        df = pd.read_csv(f"data/{uuid}/raw_data.csv")
        gen_samples(uuid, df)
        return

    for ext in ["tiff", "tif"]:
        if uploaded_file.name.endswith(ext):
            fs = FileSystemStorage()
            name = fs.save(f"data/{uuid}/raw_tiff.{ext}", uploaded_file)
            df = convert_save_tiff(f"data/{uuid}/raw_tiff.{ext}", request, uuid)
            gen_samples(uuid, df)
            return


class MaintainerView(View):
    def get(self, request):
        context = {
            "geotiff_Form": geotiff_form(),
            "excel_Form": excel_form(),
        }
        return render(request, "byod/byod.html", context)

    def post(self, request):
        uuid = str(uuid_module.uuid4())

        logging_preface = f"{uuid} - {request.POST['maintainer_Email']}"
        cache_values = {
            "limit_annotation_alert": False,
            "primary_time_set": False,
            "primary_country_set": False,
            "primary_admin1_set": False,
            "primary_admin2_set": False,
            "primary_admin3_set": False,
            "primary_coord_set": False,
            "logging_preface": logging_preface,
        }
        for key, value in cache_values.items():
            cache_set(uuid, key, value)

        logging.info(f"{logging_preface} - Has submitted byod info page")

        create_folder(uuid)
        capture_data(request, uuid, "maintainer", "maintainer_info")
        capture_data(request, uuid, "excel", "excel_info")
        capture_data(request, uuid, "geotiff", "geotiff_info")
        capture_data(request, uuid, "dataset", "dataset_info")
        capture_data(request, uuid, "resolution", "resolution_info")
        save_data_file(request, uuid)
        logging.info(
            f"{logging_preface} - data has been converted and saved"
        )

        return redirect(f"./analyze/{uuid}")


class GeotimeAnalyzeLoader(TaskView):
    from .tasks import geotime_analyze

    task_function = geotime_analyze
    task_status_url = "status?job_id={job_id}"
    task_name = "analyze"
    completion_url = "../../overview/{uuid}"


class GeotimeAnalyzeStatus(TaskStatusView):
    def is_done(self, request, uuid):
        done = os.path.exists(f"data/{uuid}/geotime_classification.json")
        return done


def download_csv(request, uuid):
    file_path = f"data/{uuid}/mixmasta_processed_df.csv"
    logging.info(f"Downloading transformed CSV: {file_path}")
    if os.path.exists(file_path):
        with open(file_path, "rb") as fh:
            response = HttpResponse(fh.read(), content_type="application/csv")
            response["Content-Disposition"] = f"inline; filename={uuid}.csv"
            return response
    raise Http404
