import os
import tempfile
import time
import csv
from urllib.parse import urlparse
from io import BytesIO, StringIO
from zlib import compressobj

import pandas as pd
from elasticsearch import Elasticsearch
import boto3
import botocore

from src.settings import settings
from validation import ModelSchema
from fastapi.logger import logger


es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)

# S3 OBJECT
s3 = boto3.client("s3")


def try_parse_int(s: str, default: int = 0) -> int:
    try:
        return int(s)
    except ValueError:
        return default


def delete_matching_records_from_model(model_id, record_key, record_test):
    """
    This function provides an easy way to remove information from within a specific key of a model.

    - model_id: the id of the model that we should be removing information from
    - record_key: the key of the model that we should look in to remove data (ie "parameters", "outputs")
    - record_test: a function that will run on each of the records within the record_key to see whether
        they should be deleted. record_test() should return True if this record is to be deleted
    """

    from src.models import (
        get_model,
        modify_model,
    )  # import at runtime to avoid circular import error

    record_count = 0

    model = get_model(model_id)
    records = model.get(record_key, [])
    records_to_delete = []
    for record in records:
        if record_test(record):
            records_to_delete.append(record)

    for record in records_to_delete:
        record_count += 1
        records.remove(record)

    update = {record_key: records}
    modify_model(model_id, ModelSchema.ModelMetadataPatchSchema(**update))

    return record_count


def run_model_with_defaults(model_id):
    """
    This function takes in a model and submits a default run to test that model's functionality
    """

    from src.models import get_model
    from src.dojo import get_parameters
    from src.runs import create_run, current_milli_time
    from validation.RunSchema import ModelRunSchema

    model = get_model(model_id)

    params = []
    for param in get_parameters(model_id):
        param_obj = {}
        param_obj["name"] = param["annotation"]["name"]
        param_obj["value"] = param["annotation"]["default_value"]
        params.append(param_obj)

    model_name_clean = "".join(filter(str.isalnum, model["name"]))
    run_id = f"{model_name_clean}-{current_milli_time()}"

    run = ModelRunSchema(
        id=run_id,
        model_id=model_id,
        model_name=model["name"],
        parameters=params,
        data_paths=[],
        tags=[],
        is_default_run=True,
        created_at=current_milli_time(),
    )

    create_run(run)

    # Store model ID to `tests` index with `status` set to `running`
    body = {
        "status": "running",
        "model_name": model["name"],
        "created_at": run.created_at,
        "run_id": run.id,
    }
    es.index(index="tests", body=body, id=model_id)

    return run_id


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
            Bucket=location_info.netloc, Marker=location_info.path
        )
        s3_contents = s3_list["Contents"]
        final_file_list = []
        for x in s3_contents:
            filename = x["Key"]
            final_file_list.append(f"{location_info.path}/{filename}")

        return final_file_list
    else:
        raise RuntimeError("File storage format is unknown")


async def stream_csv_from_data_paths(data_paths, wide_format='false'):
    # Build single dataframe
    df = pd.concat(pd.read_parquet(file) for file in data_paths)

    # Ensure pandas floats are used because vanilla python ones are problematic
    df = df.fillna('').astype(
        {col: 'str' for col in df.select_dtypes(include=['float32', 'float64']).columns},
        # Note: This links it to the previous `df` so not a full copy
        copy=False
    )
    if wide_format == "true":
        df_wide = pd.pivot(df, index=None, columns='feature', values='value')  # Reshape from long to wide
        df = df.drop(['feature', 'value'], axis=1)
        df = pd.merge(df, df_wide, left_index=True, right_index=True)

    # Prepare for writing CSV to a temporary buffer
    buffer = StringIO()
    writer = csv.writer(buffer)

    # Write out the header row
    writer.writerow(df.columns)

    yield buffer.getvalue()
    buffer.seek(0)  # To clear the buffer we need to seek back to the start and truncate
    buffer.truncate()

    # Iterate over dataframe tuples, writing each one out as a CSV line one at a time
    for record in df.itertuples(index=False, name=None):
        writer.writerow(str(i) for i in record)
        yield buffer.getvalue()
        buffer.seek(0)
        buffer.truncate()


async def compress_stream(content):
    compressor = compressobj()
    async for buff in content:
        yield compressor.compress(buff.encode())
    yield compressor.flush()

