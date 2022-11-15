"""
    Docker Hub helper to scrape model images for the UI.
    see https://docs.docker.com/docker-hub/api/latest/#
    see https://github.com/jataware/dojo/issues/77
    Requires credentials for Pro or Team plan.
"""
import logging
import requests
from uuid import UUID
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import NotFoundError

from src.settings import settings

es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)

logger: logging.Logger = logging.getLogger(__name__)


def is_uuid(uuid_str):
    """
    Simple way to check to see if a string is a valid UUID.
    Try to build a UUID object and catch if it fails
    """
    try:
        UUID("{%s}" % uuid_str)
        return True
    except ValueError as e:
        return False


def authenticate() -> str:
    """
    Description
    -----------
    Basic authentication of Docker Hub Api. Uses base url and credentials
    stored in .env settings.

    Returns
    -------
    str: JWT Token
    """

    url = f"{settings.DOCKERHUB_URL}/users/login"
    dockerhub_user = settings.DOCKERHUB_USER
    dockerhub_pwd = settings.DOCKERHUB_PWD
    auth_body = {"username": dockerhub_user, "password": dockerhub_pwd}

    response = requests.post(
        url, json=auth_body, headers={"Content-Type": "application/json"}
    )
    resp_json = response.json()

    if "token" in resp_json:
        return resp_json["token"]
    else:
        logger.error(
            f"Could not authenticate {url} with user {dockerhub_user}: {resp_json}"
        )
        raise


def get_image_tags(repo):
    """
    Description
    -----------
    Called by ui.py get_base_images() to scrape DockerHub for
    Jataware/dojo-publish images.

    Returns
    -------
    JSON Array of
        {
            "sort_order": int,
            "display_name": "string",
            "image": "string"
        }

    """

    auth_token = authenticate()

    """
        Docker Hub Url options for Get details of repository's images:
            page_size: Number of images to get per page. Defaults to 10. Max of 100.
            status: "active", "inactive"; Filters to only show images of this status.
            currently_tagged: boolean; Filters to only show images with:
                true: at least 1 current tag.
                false: no current tags.
            ordering: "last_activity""-last_activity""digest""-digest": Orders the results by this property.
            Prefixing with - sorts by descending order.
    """

    url = (
        f"{settings.DOCKERHUB_URL}/namespaces/"
        f"{settings.DOCKERHUB_ORG}/repositories/"
        f"{repo}/images?ordering=last_activity&page_size=100&currently_tagged=true"
    )

    headers = {"Accept": "application/json", "Authorization": f"Bearer {auth_token}"}

    # Get list of image tag dicts.
    image_tags = get_repo_image_details(url, headers, [])

    model_images = [
        image_tag.get("display_name")
        for image_tag in image_tags
        if is_uuid(image_tag.get("display_name"))
    ]

    models = es.mget(index="models", body={"ids": model_images})

    model_index = {
        model_obj["_id"]: model_obj.get("_source", {})
        for model_obj in models.get("docs", [])
    }

    curated_tags = []
    for image_tag in image_tags:
        tag_name = image_tag["display_name"]
        if tag_name in model_index:
            model_obj = model_index[tag_name]
            # Skip images that look like a uuid, but don't have a model associated
            if not model_obj:
                continue
            # Skip images that are not the most recent version
            if model_obj.get("next_version", False) is not None:
                continue
            image_tag["display_name"] = f"{model_obj['name']} ({tag_name})"
        curated_tags.append(image_tag)

    curated_tags.sort(
        key=lambda item: (
            not item.get("display_name").startswith("Ubuntu"),
            item.get("display_name"),
        )
    )

    for idx, d in enumerate(curated_tags):
        d["sort_order"] = idx

    return curated_tags


def get_repo_image_details(url: str, headers: dict, image_tags) -> list:
    """
    Description
    -----------
    GET request at Docker Hub to Get details of repository's images.

    Parameters
    ----------
    url: str
        Constructed url for GET.
    headers: dict
        Authentication headers.
    image_tags: list
        Current list of dict of image tag info.

    Returns
    -------
    Dict of display_name: image

    Notes
    -----
    This is built to be recursive because DockerHub will paginate the response;
    therefore, make another call if the "next" url is returned.
    """

    try:
        response = requests.get(url, headers=headers)
        resp = response.json()

        """
        Example Response
        ----------------
            {
            "count": 79,
            "next": "https://hub.docker.com/v2/namespaces/jataware/repositories/dojo-publish/images?page=2&status=active",
            "previous": null,
            "results": [
                {
                    "namespace": "jataware",
                    "repository": "dojo-publish",
                    "digest": "sha256:81ae08c9a8093e0c0c10313b844aa70e1f5be6c582b1c1a41fc073a37df35528",
                    "tags": [
                        {
                            "tag": "GoogleTrends-latest",
                            "is_current": true
                        }
                    ],
                    "last_pushed": "2021-07-15T01:16:32.454626Z",
                    "last_pulled": "2021-07-21T14:58:42.765245Z",
                    "status": "active"
                },
            ...
        """
        if "results" in resp:
            for result in resp["results"]:
                if "tags" in result:
                    tags = result["tags"][0]
                    tag = tags["tag"]
                    image = result["namespace"] + "/" + result["repository"] + ":" + tag
                    display_name = tag.replace("-latest", "")
                    updated_at = result["last_pushed"]

                    image_tags.append(
                        {
                            "display_name": display_name,
                            "image": image,
                            "sort_order": 0,
                            "updated_at": updated_at,
                        }
                    )

        # Get the next page if there is a "next".
        if "next" in resp and resp["next"] is not None:
            image_tags = get_repo_image_details(resp["next"], headers, image_tags)

        return image_tags

    except Exception as e:
        logger.error(e.message, e.args)
        return ""
