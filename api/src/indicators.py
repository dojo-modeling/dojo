from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict, Generator, List, Optional

import requests
import json
import traceback

from elasticsearch import Elasticsearch
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.logger import logger


from validation import IndicatorSchema, DojoSchema
from src.settings import settings

from src.dojo import search_and_scroll
from src.utils import plugin_action

import os


router = APIRouter()

es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)

# For created_at times in epoch milliseconds
def current_milli_time():
    return round(time.time() * 1000)


@router.post("/indicators")
def create_indicator(payload: IndicatorSchema.IndicatorMetadataSchema):
    indicator_id = payload.id
    payload.created_at = current_milli_time()
    body = payload.json()
    indicator = json.loads(body)

    plugin_action("before_create", data=indicator, type="indicator")
    es.index(index="indicators", body=indicator, id=indicator_id)
    plugin_action("post_create", data=indicator, type="indicator")

    # Indicators are registered immediately upon being created or updated
    plugin_action("before_register", data=indicator, type="indicator")
    plugin_action("register", data=indicator, type="indicator")
    plugin_action("post_register", data=indicator, type="indicator")
    
    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/api/indicators/{indicator_id}"},
        content=f"Created indicator with id = {indicator_id}",
    )


@router.put("/indicators")
def update_indicator(payload: IndicatorSchema.IndicatorMetadataSchema):
    indicator_id = payload.id
    payload.created_at = current_milli_time()
    indicator = payload.json()

    plugin_action("before_update", data=indicator, type="indicator")
    es.index(index="indicators", indicator=indicator, id=indicator_id)
    plugin_action("post_update", data=indicator, type="indicator")

    # Indicators are registered immediately upon being created or updated
    plugin_action("before_register", data=indicator, type="indicator")
    plugin_action("register", data=indicator, type="indicator")
    plugin_action("post_register", data=indicator, type="indicator")

    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/api/indicators/{indicator_id}"},
        content=f"Updated indicator with id = {indicator_id}",
    )


@router.get("/indicators", response_model=DojoSchema.IndicatorSearchResult)
def search_indicators(
    query: str = Query(None), size: int = 10, scroll_id: str = Query(None)
) -> DojoSchema.IndicatorSearchResult:
    return search_and_scroll(
        index="indicators", size=size, query=query, scroll_id=scroll_id
    )


@router.get("/indicators/{indicator_id}")
def get_indicators(indicator_id: str) -> IndicatorSchema.IndicatorMetadataSchema:
    try:
        indicator = es.get(index="indicators", id=indicator_id)["_source"]
    except:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return indicator
