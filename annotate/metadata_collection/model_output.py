import os
from django.shortcuts import redirect, render
from utils.cache_helper import cache_set
from .helper_functions import init_cache_set, create_folder, get_domains
from .dojo_interactions import hit_dojo, handle_dojo_response
from .metadata import Metadata
from django.views import View
import json
import logging

os.environ["KMP_DUPLICATE_LIB_OK"] = "True"


class ModelOutput(View):
    def post(self, request, *args, **kwargs):
        with open(f'data/{request.POST.get("uuid")}/context.json', "r") as f:
            context = json.load(f)

        context["mode"] = "byom"
        uuid = request.POST.get("uuid")
        meta = Metadata(uuid=uuid)
        meta.collect_information(request.POST)

        for x in context:
            if x not in meta.data:
                meta.data[x] = context[x]

        for out in [
            "excel_info.json",
            "geotiff_info.json",
            "dataset_info.json",
            "resolution_info.json",
            "context.json",
        ]:
            meta.save(f"{context['parent_folder']}/{context['uuid']}/{out}")

        init_cache_set(context)
        logging.info(f"{context['logging_preface']} - post registration information")
        return redirect(f"./analyze/{uuid}")

    def get(self, request, *args, **kwargs):
        from shutil import copyfile

        context = {}
        meta = Metadata()
        uuid = meta.uuid
        create_folder(uuid)

        try:
            context["uuid"] = uuid
            context["reqid"] = request.GET.get("reqid", "")
            context["parent_folder"] = "data"
            context, response = hit_dojo(context)

            (full_file_path, model_id, fn, email) = handle_dojo_response(
                response, context
            )
            full_file_path = str(full_file_path)
            fn = str(fn)
            context["logging_preface"] = f"{uuid} - {email}"
            logging.info(
                f"{context['logging_preface']} - started model_output registration"
            )

        except Exception as e:
            logging.warn(e)
            return render(request, "metadata_collection/error.html", context)

        cache_map = {
            "full_file_path": full_file_path,
            "model_id": model_id,
            "fp": fn,
            "email": email,
        }

        context["uploaded_file_fp"] = f"data/{uuid}/{fn}"
        context["local_fp"] = fn
        context["output_path"] = f"data/{uuid}/raw_data.csv"
        context["terminal_fp"] = full_file_path
        

        for k in cache_map:
            try:
                cache_set(uuid, k, cache_map[k])
            except Exception as e:
                logging.warn(e)

        with open(f"data/{uuid}/context.json", "w") as f:
            json.dump(context, f)

        return render(request, "metadata_collection/model-output.html", context)
