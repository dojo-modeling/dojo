"""Class to collect all form information from model data registration and indicator registration"""
import uuid as uuid_module
import logging
import json


class Metadata:

    MULTI_VALUE_PARAMS =["dataset_Domains",]

    def __init__(self, uuid=None):
        if uuid:
            self.uuid = uuid
        else:
            self.uuid = str(uuid_module.uuid4())
        self.data = {}

    def save(self, fp):
        with open(fp, "w") as f:
            json.dump(self.data, f)

    def custom_multiband_processing(self, data):
        bands = {}
        to_del = []
        for k in data:
            if k.lower().find('band_') != -1:
                new_key = k.split('_')[1]
                try:
                    int(new_key)
                except:
                    continue
                to_del.append(k)
                if data[k] == "":
                    continue
                bands[new_key] = data[k]


        for k in to_del:
            del data[k]

        self.data['bands'] = bands

    def geotiff_band_custom_processing(self, entry):
        # entry['Band'] = int(entry['Band'])
        return int(entry)

    def category_processing(self, entry):
        """split categories and remove whitespace"""
        return [x.strip() for x in entry.split(",")]

    def field_specific_post_processing(self):
        """add custom post processing to all fields collected"""
        col_specific_processing = {
            "geotiff_Band": self.geotiff_band_custom_processing,
            "category": self.category_processing,
        }
        for k in self.data:
            if k in col_specific_processing:
                self.data[k] = col_specific_processing[k](self.data[k])

    def make_mini_dicitonary(self, dictionary, parent_key):
        self.data[parent_key.replace("_", "")] = {}
        for k in dictionary:
            if k.find(parent_key) != -1:
                self.data[parent_key.replace("_", "")][
                    k.replace(f"{parent_key}", "")
                ] = dictionary[k]
        return self.data

    def organize_response(self, post):
        """take in the response from the form and organize it"""
        # parent_keys = ['maintainer_', 'file_', 'resolution_', 'dataset_', 'excel_', 'geotiff_']

        self.custom_multiband_processing(post)

        for k in self.data:
            #delete fields that we have already processed
            if k in post:
                del post[k]


        parent_keys = []
        for k in parent_keys:
            self.make_mini_dicitonary(post, k)

        parent_key = False
        for k in post:
            parent_key = False
            for x in parent_keys:
                # if key in response in parent_keys don't add it back in to the dictionary
                if k.find(x) == -1:
                    continue
                else:
                    parent_key = True
            if not parent_key:
                self.data[k] = post[k]

    def collect_information(self, post):
        """collecting the json response from the rendered form"""
        # map json response to internal structure
        # {'Maintainer_name' : {'Maintainer' : {'Name'}}}
        post_data = {}
        for key in post:
            # If we don't use getlist, only the last value is returned
            if key in self.MULTI_VALUE_PARAMS:
                post_data[key] = post.getlist(key)
            else:
                post_data[key] = post[key]
        self.organize_response(post_data)
        self.field_specific_post_processing()
