import json
import logging
import os
import sys

import pandas as pd
from django_rq import job
from django.shortcuts import render, redirect


from conversions.conversions import (
    capture_geotiff_info,
    convert_save_tiff,
    convert_save_excel,
    convert_save_cdf,
    gen_samples,
)
from conversions.conversion_forms import geotiff_form, excel_form
from utils.cache_helper import cache_get, cache_set
from geotime_classify import geotime_classify as gc


def apply_geotime(uuid):
    def convert_gc(c):
        ret = {}
        for x in c:
            ret[x["column"]] = x
            del ret[x["column"]]["column"]
        return ret

    c_classified = {}
    o = sys.stdout
    try:
        logging.disable(logging.INFO)
        logging.disable(logging.WARNING)
        logging.disable(logging.DEBUG)
        logging.disable(logging.ERROR)
        f = open(os.devnull, "w")
        sys.stdout = f
        GeoTimeClass = gc.GeoTimeClassify(50)
        df = pd.read_csv(f"data/{uuid}/raw_data.csv", nrows=500)
        df.to_csv(f"data/{uuid}/raw_data_geotime.csv", index=False)
        c_classified = GeoTimeClass.columns_classified(
            f"data/{uuid}/raw_data_geotime.csv"
        )
        c_classified = convert_gc(c_classified.dict()["classifications"])
    except Exception as e:
        print(e)
        c_classified = {}
    sys.stdout = o
    logging.disable(logging.NOTSET)
    json.dump(c_classified, open(f"data/{uuid}/geotime_classification.json", "w"))
    return


@job("default", timeout=-1)
def geotime_analyze(uuid):
    uploaded_file = cache_get(uuid, "uploaded_file", "")
    if uploaded_file.endswith(".nc"):
        logging.info(f"Delayed conversion of NetCDF...")
        df = convert_save_cdf(f"data/{uuid}/raw_cdf.nc", uuid)
        gen_samples(uuid, df)
        logging.info(f"...NetCDF conversion completed.")
    apply_geotime(uuid)
