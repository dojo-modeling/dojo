import json
import hashlib

from flask import Blueprint, render_template, request, redirect, session, flash, url_for, abort, jsonify

from dojo import DojoClient
from utils import convert_to_template, build_s3_key, build_s3_url, upload_to_s3

web = Blueprint('web', __name__)
dojo = DojoClient()

@web.route('/', methods=['GET', 'POST'])
def index():

    model_id = request.args.get("model")
    if not model_id:
        return abort(400, "Please specify a model query argument")

    mode = request.args.get("mode")
    if not mode:
        return abort(400, "Please specify a mode query argument")

    if request.method == "GET":
        return render_template("editor.html", mode=mode, js_init=json.dumps({
            "mode": mode,
            "editor_content": None,
        }))

    # POST to save data
    saved_data = request.get_json()

    path = saved_data.get("path")
    if not path:
        return abort(400, "Please specify a path query argument")

    for param in saved_data["params"]:  # add template metadata to each param

        param["id"] = param.pop("_id")

        param["template"] = {}
        param["template"]["path"] = path
        param["template"]["mode"] = mode

        meta_fields = {
            "is_editable":      "is_editable",
            "_location":        "location",
            "_orig_selection":  "orig_val",
        }
        for old_key, new_key in meta_fields.items():
            param["template"][new_key] = param.pop(old_key)

        param["choices"] = json.loads(param.get("choices", "[]"))


    dojo.update_params(model_id, mode, path, saved_data["params"])

    template = convert_to_template(saved_data["editor_html"])

    if mode == "config":

        template_key = build_s3_key(model_id, path, "template")
        upload_to_s3(template, template_key)

        raw_key = build_s3_key(model_id, path, "raw")
        upload_to_s3(saved_data["editor_content"], raw_key)

        dojo.create_configs({
            "model_id": model_id,
            "s3_url": build_s3_url(template_key),
            "s3_url_raw": build_s3_url(raw_key),
            "path": path,
            "md5_hash": hashlib.md5(saved_data["editor_content"].encode('utf-8')).hexdigest(),
        })
    elif mode == "directive":
        dojo.create_directive({
            "model_id": model_id,
            "command": template,
            "command_raw": saved_data["editor_content"],
            "cwd": path,
        })

    return "saved those parameters"

@web.route('/model-params/', methods=['GET'])
def model_params():
    model_id = request.args.get("model")
    if not model_id:
        return abort(400, "Please specify a model query argument")

    path = request.args.get("path")
    if not path:
        return abort(400, "Please specify a path query argument")

    mode = request.args.get("mode")
    if not mode:
        return abort(400, "Please specify a mode query argument")

    params = dojo.load_params(model_id, mode, path)

    # flatten dojo meta back out like frontend expects
    # see 'add template metadata to each param' above
    # this is basically doing the opposite of that...
    for param in params:
        param["_id"] =              param.pop("id")
        param["_location"] =        param["template"].pop("location")
        param["_orig_selection"] =  param["template"].pop("orig_val")
        param["is_editable"] =      param["template"].pop("is_editable")

    return jsonify(params)


@web.route('/iframe/demo/', methods=['GET'])
def iframe_demo():
    return render_template("iframe-demo.html")

@web.route('/_ping/', methods=['GET'])
def ping():
    return "ok"

@web.route('/_exception/', methods=['GET'])
def exception():
    raise Exception("You want an exception? You got one!")
