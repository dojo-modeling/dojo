from .helper_functions import save_file, init_cache_set, create_folder
from .metadata import Metadata
import logging
from django.views import View
from django.shortcuts import render, redirect
import json
from shutil import copy
import os

def copy_json(old_id, new_id):
    create_folder(new_id)

    for file_name in os.listdir(f'data/{old_id}'):
        if file_name.endswith('.json'):
            if file_name.find('geotime_classification') == -1 and file_name.find('context') == -1:
                copy(f'data/{old_id}/{file_name}', f'data/{new_id}/{file_name}')


class LoadData(View):
    def post(self, request, *args, **kwargs):
        data = request.POST
        meta = Metadata()
        meta.collect_information(data)

        prev_id = data['previous_indicator_id']
        with open(f'data/{prev_id}/context.json', 'r') as f:
            old_context = json.load(f)

        context = meta.data
        context["logging_preface"] = f"{meta.uuid} - {old_context['maintainer_Email']}"
        context["uuid"] = meta.uuid
        output_location = f"{old_context['parent_folder']}/{meta.uuid}/raw_data.csv"
        context["output_path"] = output_location

        for k in old_context:
            if k not in context:
                #copy over old context except for the ones that are already in the new context
                context[k] = old_context[k]
        
        save_file(request, context)
        
        init_cache_set(context)
        # save raw file
        

        for f in [
            "maintainer_info",
            "excel_info",
            "geotiff_info",
            "dataset_info",
            "resolution_info",
        ]:
            meta.save(f"{context['parent_folder']}/{context['uuid']}/{f}.json")

        if prev_id not in os.listdir('data'):
            return render(request, 'metadata_collection/error.html', None)
        copy_json(prev_id, meta.uuid)
        

        json.dump(context, open(f"data/{context['uuid']}/context.json", "w"))
        logging.info(f"{context['logging_preface']} - started indicator registration")

        return redirect(f"./analyze/{meta.uuid}")
    
    def get(self, request, *args, **kwargs):
        return render(request, 'metadata_collection/load-data.html', None)