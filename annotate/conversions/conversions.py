from django.shortcuts import render, redirect
import logging
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse
import os
import json
import logging
import numpy as np
import pandas as pd
import pickle
from mixmasta import mixmasta as mix
from utils.cache_helper import cache_set

logger = logging.getLogger(__name__)


def capture_geotiff_info(request, uuid):
    body = request.POST
    to_write = {}

    for x in body.keys():
        if x.lower().find("maintainer") != -1:
            continue
        else:
            to_write[x] = body[x]

    logging.info(f"User has begun BYOD workflow with uuid: {uuid}")
    json.dump(
        to_write, open(f"data/{uuid}/maintainer_info.json", "w")
    )
    return request


def convert_save_excel(uploaded_file, uuid, sheet=None):
    logger.info("Excel file detected.")
    if sheet == None:
        df = pd.read_excel(uploaded_file)
    else:
        df = pd.read_excel(uploaded_file, sheet_name=sheet)
    df.to_csv(f"data/{uuid}/raw_data.csv", index=False)
    return df


def convert_save_tiff(file, request, uuid):
    feats = []
    body = request.POST

    conv = {
        "geotiff_Feature_Name": None,
        "geotiff_Band": None,
        "geotiff_Null_Val": None,
        "geotiff_Date": None,
    }
    for x in conv.keys():
        if request.POST[x] == "":
            pass
        else:
            if request.POST[x].strip().isnumeric():
                conv[x] = int(request.POST[x].strip())
            else:
                conv[x] = str(request.POST[x].strip())

    feature_name, band, date, nodataval = (
        conv["geotiff_Feature_Name"],
        conv["geotiff_Band"],
        conv["geotiff_Date"],
        conv["geotiff_Null_Val"],
    )

    df = mix.raster2df(
        file, feature_name=feature_name, band=band, date=date, nodataval=nodataval
    )

    print("columns", df.columns)

    if "Unnamed: 0" in df.columns:
        df = df.drop(columns="Unnamed: 0")

    df.to_csv(f"data/{uuid}/raw_data.csv")

    if "Unnamed: 0" in df.columns:
        df = df.drop("Unnamed: 0", axis=1)

    logger.info(f"data/{uuid}/raw_data.csv")
    return df


def convert_save_cdf(fpath, uuid):
    df = mix.netcdf2df(fpath)
    if "Unnamed: 0" in df.columns:
        df = df.drop("Unnamed: 0", axis=1)
    df.to_csv(f"data/{uuid}/raw_data.csv", index=False)

    return df


def gen_samples(uuid, df):
    annotation_samples = {}
    for c in df.columns:
        annotation_samples[c] = [str(i) for i in list(df[c].dropna()[:5])]
        while len(annotation_samples[c]) < 5:
            annotation_samples[c].append(np.nan)

    cache_set(uuid, "annotation_samples", annotation_samples)
