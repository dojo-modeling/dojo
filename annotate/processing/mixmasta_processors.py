import pandas as pd
from mixmasta import mixmasta as mix
from annotation.tasks import (
    generate_mixmasta_files,
    post_mixmasta_annotation_processing,
)
import logging
import os
from .base_annotation import BaseProcessor


class MixmastaFileGenerator(BaseProcessor):
    @staticmethod
    def run(df, context):
        """generate the files to run mixmasta"""
        logging.info(
            f"{context.get('logging_preface', '')} - Generating mixmasta files"
        )
        generate_mixmasta_files(context)
        return df


class MixmastaProcessor(BaseProcessor):
    @staticmethod
    def run(df, context) -> pd.DataFrame:
        """final full mixmasta implementation"""
        logging.info(
            f"{context.get('logging_preface', '')} - Running mixmasta processor"
        )
        gadm_level = context["gadm_level"]
        output_path = f"{context['output_directory']}/{context['uuid']}"
        mapper_fp = context["mapper_fp"]
        raw_data_fp = context["raw_data_fp"]
        admin_level = context["admin_level"]
        uuid = context["uuid"]

        open(f"data/{uuid}/mixmasta_processed_writing", "w").close()

        ret, rename = mix.process(
            raw_data_fp, mapper_fp, admin_level, output_path, gadm=gadm_level
        )

        post_mixmasta_annotation_processing(rename, context)

        open(f"data/{uuid}/mixmasta_processed_writing", "w").close()
        ret.to_csv(f"data/{uuid}/mixmasta_processed_df.csv", index=False)
        os.remove(f"data/{uuid}/mixmasta_processed_writing")
        return df
