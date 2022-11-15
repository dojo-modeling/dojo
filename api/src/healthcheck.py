from __future__ import annotations

import time
from datetime import datetime
import requests
from typing import Any, Dict, Generator, List, Optional
import json

from elasticsearch import Elasticsearch
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.logger import logger

from validation import IndicatorSchema
from src.settings import settings

router = APIRouter()

es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)

dmc_url = settings.DMC_URL
dmc_port = settings.DMC_PORT
dmc_user = settings.DMC_USER
dmc_pass = settings.DMC_PASSWORD
dmc_base_url = f"http://{dmc_url}:{dmc_port}/api/v1"


@router.get("/healthcheck")
def get_health():

    # DMC Status
    try:
        url = f"{dmc_base_url}/health"
        response = requests.get(url, auth=(dmc_user, dmc_pass))
        dmc_status = response.json()["metadatabase"]["status"]
        print(f"DMC: {dmc_status}")
    except Exception as e:
        logger.exception(e)
        dmc_status = "broken"

    # DOJO (actually ElasticSearch Health) Status
    try:
        url = f"{dmc_base_url}/health"
        dojo_status = es.cluster.health()["status"]
        print(f"Dojo: {dojo_status}")
    except Exception as e:
        logger.exception(e)
        dojo_status = "broken"

    status = {
        "dojo": "ok"
        if dojo_status == "yellow" or dojo_status == "green"
        else "Failed Health Check",
        "dmc": "ok" if dmc_status == "healthy" else "Failed Health Check",
    }
    return status
