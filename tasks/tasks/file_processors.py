from fileinput import filename
import logging
import os
import requests
import tempfile

import pandas as pd
import xarray as xr
from raster2xyz.raster2xyz import Raster2xyz

from mixmasta import mixmasta as mix
from base_annotation import BaseProcessor
from utils import DATASET_STORAGE_BASE_URL, get_rawfile, put_rawfile

logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)


class FileLoadProcessor(BaseProcessor):
    @staticmethod
    def run(context, fp):
        """loads the file into a dataframe"""

        extension_mapping = {
            "xlsx": ExcelLoadProcessor,
            "xls": ExcelLoadProcessor,
            "tif": GeotiffLoadProcessor,
            "tiff": GeotiffLoadProcessor,
            "csv": CsvLoadProcessor,
            "nc": NetcdfLoadProcessor,
        }

        if isinstance(fp, str):
            for extension, processor in extension_mapping.items():
                if fp.lower().endswith(extension):
                    df = processor().run(context, fp)
                    return df
        t = type(fp)
        raise ValueError(f"Unable to map '{fp} to a processor, type: {t}")


class CsvLoadProcessor(BaseProcessor):
    @staticmethod
    def run(context, fp):
        """load csv"""
        df = pd.read_csv(fp)
        return df


class NetcdfLoadProcessor(BaseProcessor):
    @staticmethod
    def run(context, fp):
        """load netcdf"""
        df = mix.netcdf2df(fp)
        return df


class ExcelLoadProcessor(BaseProcessor):
    @staticmethod
    def run(context, fp):
        """load excel"""
        sheet = context.get("excel_sheet", None)
        if sheet == None:
            df = pd.read_excel(fp)
        else:
            df = pd.read_excel(fp, sheet_name=sheet)
        return df


class GeotiffLoadProcessor(BaseProcessor):
    @staticmethod
    def run(context, fp):
        """load geotiff"""

        def single_band_run():
            feature_name, band, date, nodataval = (
                context["geotiff_value"],
                context.get("band", 1),
                context["geotiff_date_value"],
                context.get("geotiff_null_value", None),
            )

            df = mix.raster2df(
                fp, feature_name=feature_name, band=band, date=date, nodataval=nodataval
            )
            return df

        def multiband_run():
            # time
            band_type = context.get("geotiff_band_type", "category")
            if band_type == 'temporal':
                band_type = 'datetime'
                date_value = None
            else:
                date_value = context.get("geotiff_value", "01/01/2001")
            
            df = mix.raster2df(
                fp,
                feature_name=context.get(
                    "geotiff_value", "feature"
                ),
                band_name=context.get(
                    "geotiff_value", "feature"
                ),
                date=date_value,
                bands=context.get("geotiff_bands", {}),
                band_type=band_type,
                nodataval=context.get("geotiff_null_value", None),
            )
            return df.sort_values(by="date")

        if context.get("geotiff_bands", False):
            return multiband_run()
        else:
            return single_band_run()


def file_conversion(context, filename=None):
    # Get raw file
    uuid = context["uuid"]
    processor = FileLoadProcessor()

    # Grabbing filename from context if it isn't passed in.
    if filename is None:
        filename = list(context["annotations"]["metadata"]["files"].keys())[0]
    file_metadata = context["annotations"]["metadata"]["files"][filename]

    raw_path = os.path.join(DATASET_STORAGE_BASE_URL, uuid, filename)
    raw_file = get_rawfile(raw_path)

    with tempfile.TemporaryDirectory() as tmpdirname:
        local_file_fp = os.path.join(tmpdirname, filename)
        with open(local_file_fp, 'wb') as local_file:
            for chunk in raw_file:
                local_file.write(chunk)

        df = processor.run(context=file_metadata, fp=local_file_fp)

        basename, _ = os.path.splitext(filename)
        temp_output_file = os.path.join(tmpdirname, "output.csv")
        csv_file_path = os.path.join(DATASET_STORAGE_BASE_URL, uuid, f'{basename}.csv')
        df.to_csv(temp_output_file, index=False)
        with open(temp_output_file, 'rb') as csv_file:
            put_rawfile(csv_file_path, csv_file)

    return csv_file_path


def model_output_preview(context, *args, **kwargs):
    fileurl = context['annotations']['metadata']['fileurl']
    filepath = context['annotations']['metadata']['filepath']
    file_uuid = context['annotations']['metadata']['file_uuid']

    url = f"{os.environ['TERMINAL_ENDPOINT']}{fileurl}"

    req = requests.get(url, stream=True)
    stream = req.raw

    filename = os.path.basename(filepath)
    processor = FileLoadProcessor()

    with tempfile.TemporaryDirectory() as tmpdirname:
        local_file_fp = os.path.join(tmpdirname, filename)
        with open(local_file_fp, 'wb') as local_file:
            for chunk in stream:
                local_file.write(chunk)

        file_metadata = context["annotations"]["metadata"]
        df = processor.run(context=file_metadata, fp=local_file_fp)
        
        sample = df.head(100)
        sample_fp = os.path.join(tmpdirname, "sample.csv")
        sample.to_csv(sample_fp, index=False)

        file_path = os.path.join('model-output-samples', context['uuid'], f'{file_uuid}.csv')
        sample_output_path = os.path.join(DATASET_STORAGE_BASE_URL, file_path)
        with open(sample_fp, 'rb') as sample_file:
            put_rawfile(sample_output_path, sample_file)

    return file_path
