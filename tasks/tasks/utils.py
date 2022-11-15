import time
import os
from io import BytesIO
import tempfile
from urllib.parse import urlparse
import logging

import botocore
import boto3
from settings import settings

# S3 OBJECT
s3 = boto3.client("s3")
DATASET_STORAGE_BASE_URL = os.environ.get("DATASET_STORAGE_BASE_URL")


def get_rawfile(path):
    location_info = urlparse(path)

    if location_info.scheme.lower() == "file":
        raw_file = open(location_info.path, "rb")
    elif location_info.scheme.lower() == "s3":
        try:
            file_path = location_info.path.lstrip("/")
            raw_file = tempfile.TemporaryFile()
            s3.download_fileobj(
                Bucket=location_info.netloc, Key=file_path, Fileobj=raw_file
            )
            raw_file.seek(0)
        except botocore.exceptions.ClientError as e:
            logging.warn(e)
            raise FileNotFoundError()
    else:
        raise RuntimeError("File storage format is unknown")

    return raw_file


def put_rawfile(path, fileobj):
    location_info = urlparse(path)

    if location_info.scheme.lower() == "file":
        if not os.path.isdir(os.path.dirname(location_info.path)):
            os.makedirs(os.path.dirname(location_info.path), exist_ok=True)
        with open(location_info.path, "wb") as output_file:
            output_file.write(fileobj.read())
    elif location_info.scheme.lower() == "s3":
        output_path = location_info.path.lstrip("/")
        s3.put_object(Bucket=location_info.netloc, Key=output_path, Body=fileobj)
    else:
        raise RuntimeError("File storage format is unknown")


def list_files(path):
    location_info = urlparse(path)
    if location_info.scheme.lower() == "file":
        return os.listdir(location_info.path)
    elif location_info.scheme.lower() == "s3":
        s3_list = s3.list_objects(
            Bucket=location_info.netloc, Prefix=location_info.path
        )
        s3_contents = s3_list["Contents"]
        final_file_list = []
        for x in s3_contents:
            filename = x["Key"]
            final_file_list.append(f"{location_info.path}/{filename}")

        return final_file_list
    else:
        raise RuntimeError("File storage format is unknown")
