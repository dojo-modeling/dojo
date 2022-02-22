from .base_annotation import BaseProcessor
from annotation.submit_views import dojo_submit
import logging


class SubmissionProcessor(BaseProcessor):
    @staticmethod
    def run(df, context):
        """uploads df and appropriate files to s3, also handles the submission of the data to Dojo"""
        logging.info(
            f"{context.get('logging_preface', '')} - Applying submission processor"
        )
        dojo_submit(context)
        
        return df
