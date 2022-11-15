from os import mkdir
import json
import os
import logging
import requests
import shutil

import pandas as pd
from geotime_classify import geotime_classify as gc
import numpy as np

from utils import get_rawfile
from settings import settings

logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)


def describe_data(context, filename=None):
    # If no filename is passed in, default to the converted raw_data file.
    if filename is None:
        filename = "raw_data.csv"

    # Load the data.
    rawfile_path = os.path.join(
        settings.DATASET_STORAGE_BASE_URL, context["uuid"], filename
    )
    file = get_rawfile(rawfile_path)
    df = pd.read_csv(file, delimiter=",")
    return describe_df(df)


def describe_df(df):
    # Get the data description.
    base_description = json.loads(df.describe(include="all").to_json())
    description = {
        col: {stat: val for stat, val in stats.items() if not pd.isna(val)}
        for col, stats in base_description.items()
    }

    logging.warn(f"description: {description}")

    # Use Histogram functions
    histogram_data = generate_histogram_data(df)

    # Return the description.
    return description, json.loads(histogram_data)


def generate_histogram_data(dataframe):

    return dataframe.apply(histogram_data).to_json()


def histogram_data(x):
    logging.info(f"Inside histogram_data: {x}, dtype: {x.dtype}")
    x_mod = x.dropna()
    if x_mod.empty:
        return
    if x_mod.dtype != np.dtype(np.object) and x_mod.dtype != np.dtype(np.bool):
        logging.info("Trying to build histogram for column")
        hist, bins = np.histogram(x_mod)
        return {"values": hist, "bins": bins}
