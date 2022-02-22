from .helper_functions import save_file, init_cache_set, create_folder, get_domains
from .metadata import Metadata
import logging
from django.views import View
from django.shortcuts import render, redirect
import json


class Indicator(View):
    def post(self, request, *args, **kwargs):
        logging.info(request.POST)
        logging.warn(request.POST)

        meta = Metadata()
        meta.collect_information(request.POST)

        create_folder(meta.uuid)

        context = meta.data
        context["parent_folder"] = "data"
        context["logging_preface"] = f"{meta.uuid} - {meta.data['maintainer_Email']}"
        context["uuid"] = meta.uuid
        output_location = f"{context['parent_folder']}/{meta.uuid}/raw_data.csv"
        context["output_path"] = output_location

        init_cache_set(context)

        # save raw file
        fp = save_file(request, context)


        for f in [
            "maintainer_info",
            "excel_info",
            "geotiff_info",
            "dataset_info",
            "resolution_info",
        ]:
            meta.save(f"{context['parent_folder']}/{context['uuid']}/{f}.json")

        json.dump(context, open(f"data/{context['uuid']}/context.json", "w"))
        logging.info(f"{context['logging_preface']} - started indicator registration")

        return redirect(f"./analyze/{meta.uuid}")

    def get(self, request, *args, **kwargs):
        domains = get_domains()
        context = {"domains": domains}
        return render(request, f"metadata_collection/indicator.html", context)
