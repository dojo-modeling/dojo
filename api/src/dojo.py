import os
import io
import requests
import uuid

from typing import List

from elasticsearch import Elasticsearch
from elasticsearch.exceptions import NotFoundError

from fastapi import APIRouter, Response, status, Request, HTTPException
from fastapi.responses import StreamingResponse
from validation import DojoSchema
from src.settings import settings
from src.utils import delete_matching_records_from_model, put_rawfile, get_rawfile, stream_csv_from_data_paths, compress_stream
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)

def search_by_model(model_id):
    q = {"query": {"term": {"model_id.keyword": {"value": model_id, "boost": 1.0}}}}
    return q

def search_for_config(model_id, path):
    q = {
        "query":{
            "bool":{
                "filter":[
                    {
                    "bool":{
                        "filter":[
                            {
                                "bool":{
                                "should":[
                                    {
                                        "match_phrase":{
                                            "path": path
                                        }
                                    }
                                ],
                                }
                            },
                            {
                                "bool":{
                                "should":[
                                    {
                                        "match_phrase":{
                                            "model_id": model_id
                                        }
                                    }
                                ],
                                }
                            }
                        ]
                    }
                    }
                ]
            }
        }
    }
    return q


def search_and_scroll(index, query=None, size=10, scroll_id=None):
    if query:
        q = {
            "query": {
                "query_string": {
                    "query": query,
                }
            },
        }
    else:
        q = {"query": {"match_all": {}}}
    if not scroll_id:
        # we need to kick off the query
        results = es.search(index=index, body=q, scroll="2m", size=size)
    else:
        # otherwise, we can use the scroll
        results = es.scroll(scroll_id=scroll_id, scroll="2m")

    # get count
    count = es.count(index=index, body=q)

    # if results are less than the page size (10) don't return a scroll_id
    if len(results["hits"]["hits"]) < size:
        scroll_id = None
    else:
        scroll_id = results.get("_scroll_id", None)
    return {
        "hits": count["count"],
        "scroll_id": scroll_id,
        "results": [i["_source"] for i in results["hits"]["hits"]],
    }


@router.get("/dojo/import")
def import_json_data():
    """
    In order to facilitate testing, you can place json files in the `es-mappings/import` directory
    with the ES index name as the file name, such as `es-mappings/import/models.json`. Visiting this endpoint
    will import the data in those files and save it to the local elasticsearch instances.
    """

    from glob import glob
    import json

    for file in glob("es-mappings/import/*", recursive=True):

        index = file.split("/")[-1].split(".json")[0]

        print(f"Importing {file} into {index}", flush=True)
        data = json.loads(open(file).read())
        if type(data) == list:
            for x in data:
                result = es.index(index=index, body=x, id=x["id"])
        else:
            result = es.index(index=index, body=data, id=data["id"])

    return Response(
        status_code=status.HTTP_200_OK,
        content=f"Imported",
    )


@router.post("/dojo/directive")
def create_directive(payload: DojoSchema.ModelDirective):
    """
    Create a `directive` for a model. This is the command which is used to execute
    the model container. The `directive` is given a set of parameters and the indices
    that must be modified in order to insert the user parameters.
    """

    es.index(index="directives", body=payload.json(), id=payload.model_id)
    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/dojo/directive/{payload.model_id}"},
        content=f"Created directive for model with id = {payload.model_id}",
    )


@router.get("/dojo/directive/{model_id}")
def get_directive(model_id: str) -> DojoSchema.ModelDirective:
    results = es.search(index="directives", body=search_by_model(model_id))
    try:
        directive = results["hits"]["hits"][-1]["_source"]
        return directive
    except:
        return Response(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Directive for model {model_id} not found.",
        )

def copy_directive(model_id: str, new_model_id: str):
    """
    Copy the directive from one model_id to a new_model_id
    """
    directive = get_directive(model_id)
    if type(directive) == Response:
        return False
    directive['id'] = str(uuid.uuid4())
    directive['model_id'] = new_model_id

    d = DojoSchema.ModelDirective(**directive)
    create_directive(d)

def get_config_path(model_id, path):
    return f'{settings.CONFIG_STORAGE_BASE}{model_id}{path}'

@router.post("/dojo/config")
def create_configs(payload: List[DojoSchema.ModelConfigCreate]):
    """
    Create one or more model `configs`. A `config` is a settings file which is used by the model to
    set a specific parameter level. Each `config` is stored to S3 and contains a list of parameters
    which show which indices to replace with user input.
    """
    if len(payload) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST,content=f"No payload")

    for config_data in payload:
        model_config = config_data.model_config
        file_content = config_data.file_content

        # remove existing configs with this model_id and path
        response = es.search(index="configs", body=search_for_config(model_config.model_id, model_config.path), size=10000)
        for hit in response["hits"]["hits"]:
            es.delete(index="configs", id=hit["_id"])

        fileobj = io.BytesIO(file_content.encode('utf-8'))
        put_rawfile(
            get_config_path(model_config.model_id, model_config.path),
            fileobj
        )

        es.index(index="configs", body=model_config.json())
    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/dojo/config/{model_config.model_id}"},
        content=f"Created config(s) for model with id = {model_config.model_id}",
    )

@router.get("/dojo/config/{model_id}")
def get_configs(model_id: str) -> List[DojoSchema.ModelConfig]:
    results = es.search(index="configs", body=search_by_model(model_id), size=10000)
    try:
        return [i["_source"] for i in results["hits"]["hits"]]
    except:
        return Response(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Config(s) for model {model_id} not found.",
        )


@router.delete("/dojo/config/{model_id}")
def delete_config(model_id: str, path: str):
    """
    Delete a model `configs`. Each `config` is stored to S3, templated out using Jinja, where each templated `{{ item }}`
    maps directly to the name of a specific `parameter.
    """

    response = es.search(index="configs", body=search_for_config(model_id, path), size=10000)

    config_count, param_count = 0, 0
    for hit in response["hits"]["hits"]:
        config = hit["_source"]
        config_count += 1

        # search the model for params in this config and remove those
        def param_matches(param):
            return param.get("template", {}).get("path") == path
        param_count += delete_matching_records_from_model(config["model_id"], "parameters", param_matches)

        # TODO remove s3_url and s3_url_raw from s3?
        es.delete(index="configs", id=hit["_id"])

    return Response(
        status_code=status.HTTP_200_OK,
        headers={"location": f"/dojo/config/{model_id}"},
        content=f"Deleted {config_count} config(s) and {param_count} param(s) for model {model_id} with path = {path}",
    )



def copy_configs(model_id: str, new_model_id: str):
    """
    Copy config files for one model_id to a new_model_id
    """
    configs = get_configs(model_id)
    if type(configs) == Response:
        return False
    config_create_request = []

    for config in configs:
        content = get_rawfile(
            get_config_path(config['model_id'], config['path'])
        ).read().decode()
        config['id'] = str(uuid.uuid4())
        config['model_id'] = new_model_id

        config_data = DojoSchema.ModelConfigCreate(
            model_config=DojoSchema.ModelConfig(**config),
            file_content=content
        )
        config_create_request.append(config_data)

    create_configs(config_create_request)



@router.get("/dojo/parameters/{model_id}")
def get_parameters(model_id: str) -> List[DojoSchema.Parameter]:
    config_params = [ param for config in get_configs(model_id)
                            for param in config['parameters']
                    ]
    try:
        directive_params = [ param for param in get_directive(model_id)['parameters']]
        return config_params + directive_params
    except Exception as e:
        logger.info(f"No directives returned. Likely using a defunct model. Directive fetch failed with: {e}")
        return config_params
    
    

@router.post("/dojo/outputfile")
def create_outputfiles(payload: List[DojoSchema.ModelOutputFile]):
    """
    Create an `outputfile` for a model. Each `outputfile` represents a single file that is created upon each model
    execution. Here we store key metadata about the `outputfile` which enables us to find it within the container and
    normalize it into a standardized format.
    """
    if len(payload) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST,content=f"No payload")

    for p in payload:
        es.index(index="outputfiles", body=p.json(), id=p.id)

    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/api/dojo/outputfile/{p.id}"},
        content=f"Created outputfile(s) for model with id = {p.model_id}",
    )


@router.get("/dojo/outputfile/{model_id}")
def get_outputfiles(model_id: str) -> List[DojoSchema.ModelOutputFile]:
    results = es.search(index="outputfiles", body=search_by_model(model_id), size=10000)
    try:
        return [i["_source"] for i in results["hits"]["hits"]]
    except:
        return Response(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Outputfile(s) for model {model_id} not found.",
        )


@router.delete("/dojo/outputfile/{outputfile_id}")
def delete_outputfile(outputfile_id: str):
    """
    Delete a model's `outputfiles`.
    """

    try:

        outputfile = es.get(index="outputfiles", id=outputfile_id)["_source"]

        # search the model for outputs that use this outputfile's ID
        def output_matches(output):
            return output.get("uuid") == outputfile_id
        output_count = delete_matching_records_from_model(outputfile["model_id"], "outputs", output_matches)
        qualifier_output_count = delete_matching_records_from_model(outputfile["model_id"], "qualifier_outputs", output_matches)

        es.delete(index="outputfiles", id=outputfile_id)

        return Response(
            status_code=status.HTTP_200_OK,
            headers={"location": f"/dojo/outputfile/{outputfile_id}"},
            content=f"Deleted outputfile, {output_count} output(s) and {qualifier_output_count} qualifier output(s) with outputfile_id = {outputfile_id}",
        )
    except NotFoundError:
        return Response(
            status_code=status.HTTP_404_NOT_FOUND,
            headers={"location": f"/dojo/outputfile/{outputfile_id}"},
            content=f"Couldn't find the output file with id = {outputfile_id}",
        )



def copy_outputfiles(model_id: str, new_model_id: str):
    """
    Copy outputfiles for a single model_id to a new_model_id
    """
    outputfiles = get_outputfiles(model_id)
    if type(outputfiles) == Response:
        return False
    model_outputs = []
    changed_uuids = {}

    for f in outputfiles:
        old_id = f['id']
        f['id'] = str(uuid.uuid4())
        changed_uuids[old_id] = f['id']
        f['model_id'] = new_model_id
        f['prev_id'] = old_id

        requests.get(f'{os.getenv("ANNOTATE_URL")}/version?old_uuid={old_id}&new_uuid={f["id"]}&old_model_id={model_id}&new_model_id={new_model_id}')
        m = DojoSchema.ModelOutputFile(**f)
        model_outputs.append(m)

    create_outputfiles(model_outputs)
    return changed_uuids


### Accessories Endpoints

@router.get("/dojo/accessories/{model_id}")
def get_accessory_files(model_id: str) -> List[DojoSchema.ModelAccessory]:
    """
    Get the `accessory files` for a model.

    Each `accessory file` represents a single file that is created to be
    associated with the model. Here we store key metadata about the
    `accessory file` which  enables us to find it within the container and
    extract it from the container.
    """

    try:
        results = es.search(index="accessories", body=search_by_model(model_id), size=10000)
        return [i["_source"] for i in results["hits"]["hits"]]
    except:
        return Response(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Accessory file(s) for model {model_id} not found.",
        )


@router.post("/dojo/accessories")
def create_accessory_file(payload: DojoSchema.ModelAccessory):
    """
    Create or update an `accessory file` for a model.

    `id` is optional and will be assigned a uuid by the API.

    Each `accessory file` represents a single file that is created to be
    associated with the model. Here we store key metadata about the
    `accessory file` which  enables us to find it within the container and
    extract it from the container.
    """
    try:
        payload.id = uuid.uuid4() # update payload with uuid
        es.update(index="accessories", body={"doc": payload.dict()}, id=payload.id)
        return Response(
            status_code=status.HTTP_200_OK,
            headers={"location": f"/dojo/accessory/{payload.model_id}"},
            content=f"Created accessory for model with id = {payload.model_id}",
        )
    except NotFoundError:
        es.index(index="accessories", body=payload.json(), id=payload.id)
        return Response(
            status_code=status.HTTP_201_CREATED,
            headers={"location": f"/dojo/accessory/{payload.model_id}"},
            content=f"Created accessory for model with id = {payload.model_id}",
        )


@router.put("/dojo/accessories")
def create_accessory_files(payload: List[DojoSchema.ModelAccessory]):
    """
    The PUT would overwrite the entire array with a new array.

    For each, create an `accessory file` for a model.

    `id` is optional and will be assigned a uuid by the API.

    Each `accessory file` represents a single file that is created to be
    associated with the model. Here we store key metadata about the
    `accessory file` which  enables us to find it within the container and
    extract it from the container.
    """
    if len(payload) == 0:
        return Response(status_code=status.HTTP_400_BAD_REQUEST,content=f"No payload")

    # Delete previous entries.
    try:
        results = es.search(index="accessories", body=search_by_model(payload[0].model_id), size=10000)
        for i in results["hits"]["hits"]:
            es.delete(index="accessories", id=i["_source"]["id"])
    except Exception as e:
        logger.error(e)

    # Add the new entries.
    for p in payload:
        p.id = uuid.uuid4() # update payload with uuid
        es.index(index="accessories", body=p.json(), id=p.id)

    return Response(
        status_code=status.HTTP_201_CREATED,
        headers={"location": f"/api/dojo/accessory/{p.id}"},
        content=f"Created accessories(s) for model with id = {p.model_id}",
    )


@router.delete("/dojo/accessories/{accessory_id}")
def delete_accessory(accessory_id: str):
    """
    Delete a model `accessory`.
    """

    try:
        es.delete(index="accessories", id=accessory_id)
        print(f"{accessory_id} deleted")
        return Response(
            status_code=status.HTTP_200_OK,
            headers={"location": f"/dojo/accessory/{accessory_id}"},
            content=f"Deleted accessory for model with id = {accessory_id}",
        )
    except NotFoundError:
        print(f"{accessory_id} not found")
        return Response(
            status_code=status.HTTP_200_OK,
            headers={"location": f"/dojo/accessory/{accessory_id}"},
            content=f"Deleted accessory for model with id = {accessory_id}",
        )


def copy_accessory_files(model_id: str, new_model_id: str):
    """
    Copy the accessory_files from one model_id to a new_model_id
    """

    a_files = get_accessory_files(model_id)

    if type(a_files) == Response:
        return False

    model_accessories = []

    for f in a_files:
        f['id'] = str(uuid.uuid4())
        f['model_id'] = new_model_id
        ma = DojoSchema.ModelAccessory(**f)
        model_accessories.append(ma)

    create_accessory_files(model_accessories)

@router.get("/dojo/domains", response_model=List[str])
def get_domains() -> List[str]:
    """
    Returns the full list of scientific domains acceptable to be applied to models and indicators.
    Source: https://skos.um.es/unesco6/view.php?fmt=1
    """

    domains = [
        "Logic",
        "Mathematics",
        "Astronomy and astrophysics",
        "Physics",
        "Chemistry",
        "Life Sciences",
        "Earth and Space Sciences",
        "Agricultural Sciences",
        "Medical Sciences",
        "Technological Sciences",
        "Anthropology",
        "Demographics",
        "Economic Sciences",
        "Geography",
        "History",
        "Juridical Sciences and Law",
        "Linguistics",
        "Pedagogy",
        "Political Science",
        "Psychology",
        "Science of Arts and Letters",
        "Sociology",
        "Ethics",
        "Philosophy",
    ]

    return domains


@router.get("/dojo/download/csv/{index}/{obj_id}")
def get_csv(index: str, obj_id: str, request: Request , wide_format: str = 'false'):
    try:
        run = es.get(index=index, id=obj_id)["_source"]
    except NotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    run_status = run.get("attributes", {}).get("status", None)

    if "deflate" in request.headers.get("accept-encoding", ""):
        return StreamingResponse(
            compress_stream(stream_csv_from_data_paths(run["data_paths"], wide_format)),
            media_type="text/csv",
            headers={'Content-Encoding': 'deflate'}
        )
    else:
        return StreamingResponse(
            stream_csv_from_data_paths(run["data_paths"],wide_format),
            media_type="text/csv",
        )

