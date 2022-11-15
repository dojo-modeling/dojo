from datetime import datetime
import json
import logging
import os
import pathlib
import re
import requests
import sys
import time
from operator import itemgetter
from threading import Thread, current_thread
from typing import Any, Dict, Generator, List, Optional

from elasticsearch import Elasticsearch
from jinja2 import Template

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, Request

from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pydantic.json import pydantic_encoder
from typing_extensions import final

from validation import RunSchema, DojoSchema

from src.models import get_model
from src.dojo import get_directive, get_outputfiles, get_configs, get_accessory_files, get_config_path
from src.utils import get_rawfile

logger = logging.getLogger(__name__)

router = APIRouter()

from src.settings import settings

router = APIRouter()

es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)


# For created_at times in epoch milliseconds
def current_milli_time():
    return round(time.time() * 1000)


dmc_url = settings.DMC_URL
dmc_port = settings.DMC_PORT
dmc_user = settings.DMC_USER
dmc_pass = settings.DMC_PASSWORD
dmc_local_dir = settings.DMC_LOCAL_DIR
dmc_base_url = f"http://{dmc_url}:{dmc_port}/api/v1"

dojo_url = settings.DOJO_URL

headers = {"Content-Type": "application/json"}


@router.get("/runs")
def search_runs(request: Request, model_name: str = Query(None), model_id: str = Query(None), size=100, scroll_id=None) -> DojoSchema.RunSearchResult:
    """
    Allows users to search for runs. Note that a `model_name` or `model_id` query argument
    will be used to filter the records in elasticsearch. Any other arbitrary `&key=value` pairs
    will be used to filter the runs based on parameters and values, in python. Since we can't
    know ahead of time what all of the possible key/values are that people might search for in
    the run's parameters, we're accessing the raw FastAPI/Starlette request object's query args.
    """

    if model_name:
        q = {"query": {"term": {"model_name.keyword": {"value": model_name, "boost": 1.0}}}}
    elif model_id:
        q = {"query": {"term": {"model_id.keyword": {"value": model_id, "boost": 1.0}}}}
    else:  # no model name specified
        q = {"query": {"match_all": {}}}

    count = es.count(index='runs', body=q)

    if count["count"] == 0:
        return {
            "hits": 0,
            "scroll_id": None,
            "results": []
        }

    if not scroll_id:
        results = es.search(index='runs', body=q, scroll="2m", size=size)
    else:
        results = es.scroll(scroll_id=scroll_id, scroll="2m")

    param_filters = dict(request.query_params)

    # don't use these keys to filter params
    for reserved_param in ["model_id", "model_name", "size", "scroll_id"]:
        param_filters.pop(reserved_param, None)

    # if results are less than the page size don't return a scroll_id
    if len(results["hits"]["hits"]) < int(size):
        scroll_id = None
    else:
        scroll_id = results.get("_scroll_id", None)

    results = [i["_source"] for i in results["hits"]["hits"]]

    if not param_filters:
        return {
            "hits": count["count"],
            "scroll_id": scroll_id,
            "results": results,
        }

    to_return = []

    for result in results:
        run_params = {}  # convert run's params into dict for quick lookups
        for param in result.get("parameters", []):
            run_params[param["name"]] = param["value"]

        for filter_key, filter_value in param_filters.items():
            run_param_value = run_params.get(filter_key)
            if run_param_value:
                if type(run_param_value) == str:  # do a "case-insensitive string contains" match
                    if filter_value.lower() in run_param_value.lower():
                        to_return.append(result)
                else:  # not a string (could be int, etc), look for an exact string-ified match
                    if filter_value == str(run_param_value):
                        to_return.append(result)

    return {
        "hits": count["count"],
        "scroll_id": scroll_id,
        "results": to_return,
    }


@router.get("/runs/{run_id}")
def get_run(run_id: str) -> RunSchema.ModelRunSchema:
    try:
        run = es.get(index="runs", id=run_id)["_source"]
    except:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return run


def dispatch_run(run):
    return


def replace_along_params(string, new_values, available_parameters):
    # Assuming no overlap
    for param in sorted(available_parameters, key=lambda param: param['start'], reverse=True):
        name = param["annotation"]["name"]
        value = new_values[name] if name in new_values else param["annotation"]["default_value"]
        string = string[:param["start"]] + str(value) + string[param["end"]:]
    return string

@router.post("/runs")
def create_run(run: RunSchema.ModelRunSchema):
    model = get_model(run.model_id)

    # get parameters
    params = {p.name: p.value for p in run.parameters}

    # generate command based on directive template
    directive = get_directive(run.model_id)

    model_command = replace_along_params(directive.get("command"), params, directive.get("parameters"))

    logging.info(f"Model Command is: {model_command}")

    ### Handle output files and append to volumeArray.

    outputfiles = get_outputfiles(run.model_id) # call dojo.py API method directly.
    output_dirs = {}
    mixmasta_inputs = []
    volumeArray = ["/var/run/docker.sock:/var/run/docker.sock"]
    for output in outputfiles:
        try:
            # rehydrate file path in
            mixmasta_input_file = Template(output["path"]).render(params)

            # get name of the mapper (will be based on output ID)
            mapper_name = f"mapper_{output['id']}.json"

            # build a volume mount for this output file's directory
            output_dir = output['output_directory']
            output_id = output['id']

            # we have to be careful since we cannot mount the same directory (within the model container) more than once
            # so if multiple output files reside in the same directory (which is common), we need to re-use that volume mount
            # and therefore need to ensure mixmasta knows where to fetch the files
            if output_dir not in output_dirs:
                output_dirs[output_dir] = output_id

            # use the lookup to build the path
            output_dir_volume = dmc_local_dir + f"/results/{run.id}/{output_dirs[output_dir]}:{output_dir}"
            logger.info('output_dir_volume:' + output_dir_volume)

            # add it to the volumeArray
            volumeArray.append(output_dir_volume)

            # build mixmasta input object
            mixmasta_input = {"input_file": f"/tmp/{output_dirs[output_dir]}/{mixmasta_input_file}",
                              "mapper": f"/mappers/{mapper_name}"}

            mixmasta_inputs.append(mixmasta_input)
        except Exception as e:
            logging.exception(e)
        logging.info(f"Mixmasta input file (model output file) is: {mixmasta_input_file}")

    ### Handle accessory files.
    accessoryFiles = get_accessory_files(run.model_id) # call dojo.py API method directly.

    logger.info(accessoryFiles)
    accessory_dirs = {}
    for accessoryFile in accessoryFiles:
        try:
            # build a volume mount for this accessory file's directory
            accessory_dir = os.path.split(accessoryFile['path'])[0] #exclude file name
            accessory_id = accessoryFile['id']

            # we have to be careful since we cannot mount the same directory (within the model container) more than once
            # so if multiple output files reside in the same directory (which is common), we need to re-use that volume mount
            # and therefore need to ensure mixmasta knows where to fetch the files
            if accessory_dir not in accessory_dirs:
                accessory_dirs[accessory_dir] = accessory_id

            # use the lookup to build the path
            try:
                # Using the accessory_file id (uuid) is breaking the docker mount:
                #accessory_dir_volume = dmc_local_dir + f"/results/{run.id}/accessories/{accessory_dirs[accessory_dir]}:{accessory_dir}"
                accessory_dir_volume = dmc_local_dir + f"/results/{run.id}/accessories:{accessory_dir}"
                logger.info('accessory_dir_volume: ' + accessory_dir_volume)
            except Exception as e:
                logging.exception(e)

            # add it to the volumeArray
            volumeArray.append(accessory_dir_volume)
        except Exception as e:
            logging.exception(e)

    # get config in s3
    try:
        configs = get_configs(run.model_id)
    except Exception as e:
        configs = []
        logging.exception(e)

    model_config_objects = []

    # get volumes
    for config_file in configs:

        mount_path = '/'.join(config_file["path"].split("/")[:-1])
        file_name = config_file["path"].split("/")[-1]
        save_path = dmc_local_dir + f"/model_configs/{run.id}/{file_name}"
        file_content = get_rawfile(
            get_config_path(run.model_id, config_file["path"])
        ).read().decode()
        model_config_objects.append(
            {
                "file_content": file_content,
                "save_path": save_path,
                "path": mount_path,
                "file_name": file_name,
                "parameters": config_file["parameters"]
            }
        )
        volumeArray.append(dmc_local_dir + f"/model_configs/{run.id}/{file_name}:{mount_path}/{file_name}")

    # remove redundant volume mounts
    volumeArray = list(set(volumeArray))

    # get s3 and file name/ paths

    run_conf = {
        "run_id": run.id,
        "model_image": model.get("image"),
        "model_id": model.get("id"),
        "model_command": model_command,
        # "model_output_directory": model_output_directory,
        "dojo_url": dojo_url,
        "params": params,
        "config_files": model_config_objects,
        "volumes": json.dumps(volumeArray),
        "mixmasta_cmd": f"causemosify-multi --inputs='{json.dumps(mixmasta_inputs)}' --output-file=/tmp/{run.id}_{run.model_id}",
    }

    logging.debug(f"run_conf: {run_conf}")

    payload = {"dag_run_id": run.id, "conf": run_conf}

    response = requests.post(
        f"{dmc_base_url}/dags/model_xform/dagRuns",
        headers=headers,
        auth=(dmc_user, dmc_pass),
        json=payload,
    )

    logging.info(f"Response from DMC: {json.dumps(response.json(), indent=4)}")

    run.created_at = current_milli_time()
    if hasattr(run, 'attributes'):
        run.attributes["status"] = "Running"
    else:
        run.attributes = {"status": "Running"}

    es.index(index="runs", body=run.dict(), id=run.id)
    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"Location": f"/api/v1/runs/{run.id}"},
        content=f"Created run with id = {run.id}",
    )


@router.get("/runs/{run_id}/logs")
def get_run_logs(run_id: str) -> RunSchema.RunLogsSchema:
    tasks_response = requests.get(
        f"{dmc_base_url}/dags/model_xform/dagRuns/{run_id}/taskInstances",
        headers=headers,
        auth=(dmc_user, dmc_pass),
    )

    task_response_dict = tasks_response.json()
    if task_response_dict.get("total_entries", 0) == 0:
        return Response(status_code=status.HTTP_404_NOT_FOUND, content="{}")

    task_instances = task_response_dict["task_instances"]

    result = {
        "run_id": run_id,
        "tasks": []
    }

    task_name_map = {
        "rehydrate-task": "Parameter expansion",
        "model-task": "Model run",
        "mapper-task": "Determine variable annotations",
        "mixmasta-task": "Standardize output",
        "accessory-task": "Upload accessory files",
        "s3push-task": "Upload model output files",
        "exit-task": "Run complete",
        "failed-task": "Run failed",
    }

    for task in sorted(task_instances, key=lambda obj: obj.get("start_date") or ""):
        task_id = task["task_id"]
        task_name = task_name_map.get(task_id, task_id)

        task_try_number = task["try_number"]
        if task_try_number:
            response_l = requests.get(
                f"{dmc_base_url}/dags/model_xform/dagRuns/{run_id}/taskInstances/{task_id}/logs/{task_try_number}",
                headers=headers,
                auth=(dmc_user, dmc_pass),
            )
            logs = response_l.text
            result["tasks"].append({
                "name": task_name,
                "task": task_id,
                "state": task["state"],
                "logs": logs
            })
    return result


@router.put("/runs")
def update_run(payload: RunSchema.ModelRunSchema):
    run_id = payload.id
    body = payload.json()
    es.index(index="runs", body=body, id=run_id)
    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/api/runs/{run_id}"},
        content=f"Updated run with id = {run_id}",
    )

@router.get("/runs/{run_id}/test")
def test_run_status(run_id: str) -> RunSchema.RunStatusSchema:
    run = get_run(run_id)
    status = run.get("attributes",{}).get("status",None)
    model_id = run.get("model_id")
    body = {"run_id": run_id,
            "status": status,
            "model_name": run.get("model_name"),
            "executed_at": run.get("attributes",{}).get("executed_at",None)}
    if status:
        es.index(index="tests", body=body, id=model_id)
        return status
    else:
        return "running"
