# views for functional endpoints

import pandas as pd
import logging
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from datetime import datetime
import xlrd
import numpy as np
import rasterio
from rasterio import MemoryFile
from utils.cache_helper import cache_get, cache_set, save_cache
import shutil
import json
import shutil
import requests
import os

def date_validation(request, uuid, col):
    samples = cache_get(uuid, "annotation_samples")
    if not samples:
        df = pd.read_csv(f"data/{uuid}/raw_data.csv", nrows=20)
        logging.info("Annotation samples unavailable, reading in dataset.")
    else:
        samples = samples[col]
        df = pd.DataFrame(samples, columns=[col])
    f = request.GET.get("format")
    try:
        for x in df[col].values[:20]:
            datetime.strptime(str(x), f)
    except Exception as e:
        # This is generally a strptime failue and is expected
        logging.debug(e)
        response = {"response": "False"}
        return JsonResponse(response)
    response = {"response": "True"}

    return JsonResponse(response)

def excel_sheets(request):
    xl = None
    if request.GET.get("mode", "") == "byom":
        fp = request.GET.get("fp", "")
        uuid = request.GET.get("uuid", "")
        xl = pd.read_excel(f"data/{uuid}/{fp}", nrows=100, sheet_name=None)
    else:
        xl = pd.read_excel(request.FILES["file"], nrows=100, sheet_name=None)
    response = {"sheets": list(xl.keys())}
    return JsonResponse(response)

def geotiff_bands(request):
    src = None
    try:
        if request.GET.get("mode", "") == "byom":
            fp = request.GET.get("fp", "")
            uuid = request.GET.get("uuid", "")
            src = rasterio.open(f"data/{uuid}/{fp}")
            response = {"num_bands": str(np.shape(src.read())[0])}
        else:
            with MemoryFile(request.FILES["file"]) as memfile:
                with memfile.open() as dataset:
                    data_array = dataset.read()
                    response = {"num_bands": str(np.shape(data_array)[0])}
                    return JsonResponse(response)
    except Exception as e:
        return JsonResponse({"error": str(e)})

def loading(request):
    context = {"url": request.session["redir_url"]}
    return render(request, "process/loading.html", context)


def handle_init_version(request):
    old_uuid = request.GET.get('old_uuid', False)
    new_uuid = request.GET.get('new_uuid', False)
    old_model_id = request.GET.get('old_model_id', False)
    new_model_id = request.GET.get('new_model_id', False)

    if old_uuid and new_uuid and old_model_id and new_model_id:
        shutil.copytree('data/' + old_uuid, 'data/' + new_uuid)
        cache_set(new_uuid, 'uuid', new_uuid)
        cache_set(new_uuid, 'model_id', new_model_id)
        cache_set(new_uuid, "byom", True)

        url = f"{settings.DOJO_URL}/dojo/outputfile/{old_model_id}"
        logging.debug(f"Versioning dojo url: {url}")
        response = requests.get(
            url, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD)
        ).json()            
        logging.debug(f"Dojo outputfile response: {response}")
        outputfile = [i for i in response if i.get('id') == old_uuid][0]
        file_path = f"{outputfile['output_directory']}/{outputfile['path']}"

        logging.info(f"Full file path: {file_path}")
        cache_set(new_uuid, "full_file_path", file_path)
        save_cache(new_uuid)

        return HttpResponse(status=200)
    else:
        return HttpResponse("Missing parameter: requires [old_uuid, new_uuid, old_model_id, new_model_id]", content_type='text/plain', status=400)
    