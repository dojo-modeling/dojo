from __future__ import annotations
from os import mkdir
import json
import os
import logging
import requests
import shutil

import pandas as pd
import numpy as np
from geotime_classify import geotime_classify as gc

from base_annotation import BaseProcessor
from data_processors import describe_df
from utils import get_rawfile, put_rawfile
from settings import settings

logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)


class GeotimeProcessor(BaseProcessor):
    @staticmethod
    def run(context, df, output_path):
        """apply gc to df and write"""
        logging.info(
            f"{context.get('logging_preface', '')} - Applying geotime classification"
        )

        def convert_gc(classifications):
            ret = {}
            for classification in classifications.classifications:
                col_name = classification.column
                logging.warn(f"Inside converter: {classification}")
                ret[col_name] = classification.dict()
                del ret[col_name]["column"]
            return ret

        GeoTimeClass = gc.GeoTimeClassify(100)
        if not os.path.exists(output_path):
            os.makedirs(output_path)

        sample_size = min(len(df), 100)
        df.sample(sample_size).to_csv(f"{output_path}/raw_data_geotime.csv", index=False)
        c_classified = GeoTimeClass.columns_classified(
            f"{output_path}/raw_data_geotime.csv"
        )
        try:
            c_classifiedConverted = convert_gc(c_classified)
        except Exception as e:
            logging.error(f"Error: {e}, Classified object: {c_classified}")
        json.dump(
            c_classifiedConverted,
            open(f"{output_path}/geotime_classification.json", "w"),
        )
        return c_classifiedConverted


def classify(filepath, context):
    df = pd.read_csv(filepath, delimiter=",")
    gc = GeotimeProcessor()
    datapath = f"./data/{context['uuid']}"

    final = gc.run(df=df, context=context, output_path=datapath)

    # Constructs data object for patch that updates the metadata dictionary for the MetadataModel
    json_final = json.loads(json.dumps(final))

    # Final cleanup of temp directory
    shutil.rmtree(datapath)
    return json_final


def geotime_classify(context, filename=None):

    # If no filename is passed in, default to the converted raw_data file.
    if filename is None:
        filename = "raw_data.csv"

    # Always analyze the csv version of the file
    if not filename.endswith(".csv"):
        filename = filename.split(".")[0] + ".csv"

    rawfile_path = os.path.join(
        settings.DATASET_STORAGE_BASE_URL, context["uuid"], filename
    )
    file = get_rawfile(rawfile_path)
    df = pd.read_csv(file, delimiter=",")
    gc = GeotimeProcessor()
    datapath = f"./data/{context['uuid']}"

    final = gc.run(df=df, context=context, output_path=datapath)

    # Constructs data object for patch that updates the metadata dictionary for the MetadataModel
    json_final = json.loads(json.dumps(final))
    # Type inferencing
    inferred_types = infer_types(df)
    for key in inferred_types:
        json_final[key]["type_inference"] = inferred_types[key]

    # Collect column statistics from dataframe
    statistics, histograms = describe_df(df)

    data = {
        "metadata": {
            "geotime_classify": json_final,
            "column_statistics": statistics,
            "histograms": histograms,
        }

    }
    api_url = os.environ.get("DOJO_HOST")
    request_response = requests.patch(
        f"{api_url}/indicators/{context['uuid']}/annotations",
        json=data,
    )

    return json_final, request_response


def infer_types(dataframe):
    """
    Infer the types of the columns in the dataframe.
    """
    types = dataframe.dtypes.to_dict()
    logging.warn(f"dtypes:{types}")
    # Conversion of values to IndicatorSchema compliant values for consistency.
    for key in types:
        if types[key] is np.dtype(np.object):
            types[key] = "str"
        elif types[key] is np.dtype(np.bool):
            types[key] = "boolean"
        elif types[key] is np.dtype(np.int64):
            types[key] = "int"
        elif types[key] is np.dtype(np.float64):
            types[key] = "float"
        else:
            types[key] = "unknown"

    logging.warn(f"Processed dtypes:{types}")
    return types


def model_output_geotime_classify(context, *args, **kwargs):
    file_uuid = context['annotations']['metadata']['file_uuid']
    sample_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, 'model-output-samples', context['uuid'], f'{file_uuid}.csv')
    filepath = get_rawfile(sample_path)
    return classify(filepath, context)
