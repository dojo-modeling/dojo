import requests
import logging
import json
from django.conf import settings
from pathlib import Path


def download_file(url, local_filename):
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        logging.info(r.text)
        with open(local_filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    return local_filename


def handle_dojo_response(response, context={}):
    # TODO: rewrite this function, clarify variable names, this function probably is not necessary
    model_id, fn, file_url, uuid = (
        context["model_id"],
        context["fn"],
        context["file_url"],
        context["uuid"],
    )
    
    download_file(file_url, f"{context['parent_folder']}/{uuid}/{fn}")

    url = f"{settings.DOJO_URL}/models/{model_id}"

    if settings.DOJO_USERNAME:
        r = requests.get(url, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD))
    else:
        r = requests.get(url)

    email = r.json().get("maintainer", {}).get("email", None)

    return response["file_path"], response["model_id"], fn, email


def hit_dojo(context={}):
    uuid, reqid = context["uuid"], context["reqid"]

    url = f"{settings.DOJO_URL}/terminal/file/{reqid}"
    r = None

    if settings.DOJO_USERNAME:
        r = requests.get(url, auth=(settings.DOJO_USERNAME, settings.DOJO_PASSWORD))
    else:
        r = requests.get(url)
    logging.warn(r.text)
    response = r.json()
    converter = {
        ".csv": "raw_data.csv",
        ".xlsx": "raw_excel.xlsx",
        ".xls": "raw_excel.xlsx",
        ".nc": "raw_cdf.nc",
        ".tif": "raw_tiff.tif",
        ".tiff": "raw_tiff.tiff",
    }
    fp = Path(response["file_path"])
    model_id = response["model_id"]
    fn = converter[fp.suffix]
    url = f'{settings.TERMINAL_API_ENDPOINT}{response["request_path"]}'
    context["terminal_fp"], context["model_id"], context["fn"], context["file_url"] = (
        fp,
        model_id,
        fn,
        url,
    )
    context['local_fp'] = f"{fn}"
    return context, response
