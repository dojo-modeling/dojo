from __future__ import annotations
import logging
import re
import time
import tempfile
import os
import json
from io import BytesIO
from typing import Any, Dict, List, Optional


import pandas as pd
from sqlite3 import connect

from requests import put
from fastapi import APIRouter, Response, File, UploadFile, status
from elasticsearch import Elasticsearch
from rq import Worker, Queue
from rq.job import Job
from redis import Redis
from rq.exceptions import NoSuchJobError
from rq import job
import boto3

from src.utils import get_rawfile, put_rawfile
from src.indicators import get_indicators, get_annotations
from src.settings import settings

logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)

# FAST API ROUTER
router = APIRouter()

# REDIS CONNECTION AND QUEUE OBJECTS
redis = Redis(
    os.environ.get("REDIS_HOST", "redis.dojo-stack"),
    os.environ.get("REDIS_PORT", "6379"),
)
q = Queue(connection=redis, default_timeout=-1)

# S3 OBJECT
s3 = boto3.resource("s3")


def get_context(uuid):
    try:
        annotations = get_annotations(uuid)
    except:
        annotations = {}
    try:
        dataset = get_indicators(uuid)
    except:
        dataset = {}

    context = {"uuid": uuid, "dataset": dataset, "annotations": annotations}

    return context


# RQ ENDPOINTS


@router.post("/job/fetch/{job_id}")
def get_rq_job_results(job_id: str):
    """Fetch a job's results from RQ.

    Args:
        job_id (str): The id of the job being run in RQ. Comes from the job/enqueue/{job_string} endpoint.

    Returns:
        Response:
            status_code: 200 if successful, 404 if job does not exist.
            content: contains the job's results.
    """
    try:
        job = Job.fetch(job_id, connection=redis)
        result = job.result
        return result
    except NoSuchJobError:
        return Response(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Job with id = {job_id} not found",
        )


@router.get("/job/queue/length")
def queue_length():
    return len(q)


@router.post("/job/queue/empty")
def empty_queue():
    try:
        deleted = q.empty()
        return Response(
            status_code=status.HTTP_200_OK,
            headers={"msg": f"deleted: {deleted}"},
            content=f"Queue deleted, {deleted} items removed",
        )
    except:
        return Response(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=f"Queue could not be deleted.",
        )


@router.get("/job/available_job_strings")
def available_job_strings():
    # STUB, SHOULD NOT BE HARD CODED.
    # TODO - get this from the rq worker dynamically?
    job_string_dict = {
        "Geotime Classify Job": "geotime_processors.geotime_classify",
        "Mixmasta Job": "mixmasta_processors.run_mixmasta",
        "Anomaly Detection": "tasks.anomaly_detection",
    }
    return job_string_dict


def cancel_job(job_id):
    job = Job.fetch(job_id, connection=redis)
    job.cancel()

    return job.get_status()


# Last to not interfere with other routes
@router.post("/job/{uuid}/{job_string}")
def job(uuid: str, job_string: str, options: Optional[Dict[Any, Any]] = None):

    if options is None:
        options = {}

    force_restart = options.pop("force_restart", False)
    synchronous = options.pop("synchronous", False)
    timeout = options.pop("timeout", 60)
    recheck_delay = 0.5

    job_id = f"{uuid}_{job_string}"
    job = q.fetch_job(job_id)

    context = options.pop("context", None)
    if job and force_restart:
        job.cleanup(ttl=0)  # Cleanup/remove data immediately

    if not job or force_restart:
        try:
            if not context:
                context = get_context(uuid=uuid)
        except Exception as e:
            logging.error(e)
        job = q.enqueue_call(
            func=job_string, args=[context], kwargs=options, job_id=job_id
        )
        if synchronous:
            timer = 0.0
            while (
                job.get_status(refresh=True) not in ("finished", "failed")
                and timer < timeout
            ):
                time.sleep(recheck_delay)
                timer += recheck_delay

    status = job.get_status()
    if status in ("finished", "failed"):
        job_result = job.result
        job_error = job.exc_info
        job.cleanup(ttl=0)  # Cleanup/remove data immediately
    else:
        job_result = None
        job_error = None

    response = {
        "id": job_id,
        "created_at": job.created_at,
        "enqueued_at": job.enqueued_at,
        "started_at": job.started_at,
        "status": status,
        "job_error": job_error,
        "result": job_result,
    }
    return response



# TEST ENDPOINTS


def test_job():
    # Test RQ job
    time.sleep(5)

    print("Job Job")


@router.post("/data/test/{num_of_jobs}")
def run_test_jobs(num_of_jobs):
    for n in range(int(num_of_jobs)):
        q.enqueue("tasks.test_job")


@router.get("/data/test/s3_grab/{uuid}")
def test_s3_grab(uuid):
    rawfile_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, uuid, "raw_data.csv")
    file = get_rawfile(rawfile_path)

    df = pd.read_csv(file, delimiter=",")

    preview = df.head(5).to_json(orient="records")

    return preview


@router.post("/data/test/s3_upload/{uuid}")
def test_s3_upload(uuid: str, filename: str, payload: UploadFile = File(...)):
    try:
        dest_path = os.path.join(settings.DATASET_STORAGE_BASE_URL, uuid, filename)
        put_rawfile(path=dest_path, fileobj=payload.file)
        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"msg": "File uploaded"},
            content=f"File uploaded to S3 as {filename}",
        )
    except Exception as e:
        return Response(
            status_code=status.HTTP_400_BAD_REQUEST,
            headers={"msg": f"Error: {e}"},
            content=f"File could not be uploaded.",
        )


@router.get("/data/test/job_cancel_redo")
def job_cancel_redo_test(uuid: str, job_id: str):
    response = enqueue_job("geotime_processors.process", uuid, job_id)

    time.sleep(5)

    cancel_status = cancel_job(job_id)

    response2 = enqueue_job("geotime_processors.process", uuid, job_id)

    return Response(
        status_code=status.HTTP_200_OK,
        headers={"msg": "Job cancelled and restarted"},
        content=f"Job cancelled and restarted. Cancel status: {cancel_status}",
    )
