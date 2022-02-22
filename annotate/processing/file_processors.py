import pandas as pd
from mixmasta import mixmasta as mix
from .base_annotation import BaseProcessor
import logging


class FileLoadProcessor(BaseProcessor):
    @staticmethod
    def run(df, context):
        """loads the file into a dataframe"""
        fp = context["uploaded_file_fp"]
        logging.info(f"{context.get('logging_preface', '')} - Loading file {fp}")

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
                    df = processor().run(df, context)
                    # df.columns = [str(x).strip() for x in df.columns]
                    return df
        t = type(fp)
        raise ValueError(f"Unable to map '{fp} to a processor, type: {t}")


class CsvLoadProcessor(BaseProcessor):
    @staticmethod
    def run(df, context):
        """load csv"""
        ft = 'csv'
        context['ft'] = ft
        fp = context["uploaded_file_fp"]
        df = pd.read_csv(fp)
        return df


class NetcdfLoadProcessor(BaseProcessor):
    @staticmethod
    def run(df, context):
        """load netcdf"""
        ft = 'netcdf'
        context['ft'] = ft

        fp = context["uploaded_file_fp"]
        df = mix.netcdf2df(fp)
        return df


class ExcelLoadProcessor(BaseProcessor):
    @staticmethod
    def run(df, context):
        """load excel"""
        ft = 'excel'
        context['ft'] = ft

        fp = context["uploaded_file_fp"]
        sheet = context.get("excel_Sheet", None)
        if sheet == None:
            df = pd.read_excel(fp)
        else:
            df = pd.read_excel(fp, sheet_name=sheet)
        return df


class GeotiffLoadProcessor(BaseProcessor):
    @staticmethod
    def run(df, context):
        """load geotiff"""
        fp = context["uploaded_file_fp"]
        ft = 'geotiff'
        context['ft'] = ft

        def single_band_run():    
            geotiff_meta = {
                x.replace("geotiff_", ""): context[x]
                for x in context
                if x.find("geotiff_") != -1
            }
            feature_name, band, date, nodataval = (
                geotiff_meta["Feature_Name"],
                geotiff_meta.get("Band",1),
                geotiff_meta["Date"],
                geotiff_meta["Null_Val"],
            )

            df = mix.raster2df(
                fp, feature_name=feature_name, band=band, date=date, nodataval=nodataval
            )
            return df

        def multiband_run():
            fp = context["uploaded_file_fp"]

            #time
            logging.info(f"context is: {context}")
            df = mix.raster2df(fp, 
                              feature_name=context.get('Feature_name', 'feature'), 
                              band_name=context.get('Feature_name', 'feature'), 
                              date=context.get('date', '01/01/2001'), 
                              bands = context.get('bands', {}), 
                              band_type=context.get('band_type', 'categorical'))
            return df.sort_values(by="date")
        
        if context.get('bands', False):
            return multiband_run()
        else:
            return single_band_run()


class SaveProcessorCsv(BaseProcessor):
    @staticmethod
    def run(df, context):
        """save df to output_path"""
        output_path = context.get("output_path")
        df.to_csv(output_path, index=False)
        return df
