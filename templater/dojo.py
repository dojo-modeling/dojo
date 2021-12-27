import os
import json

import requests

DOJO_HOST = os.environ["DOJO_HOST"]

def filter_params(params, mode, path):
    to_return = []
    for param in params:
        if (template_info := param.get("template")):

            template_info_path = template_info.get("path") or template_info.get("content_id")
            template_info_mode = template_info.get("mode")

            if template_info_path == path:
                # some older params have no 'mode' value set,
                # just match on path/content_id for those
                if template_info_mode in [mode, None]:
                    to_return.append(param)

    return to_return

class DojoClient(object):

    def create_configs(self, configs):
        if type(configs) != list:
            configs = [configs]  # make it a list

        return self._make_request("POST", "/dojo/config", body=configs)

    def create_directive(self, directive):
        return self._make_request("POST", "/dojo/directive", body=directive)

    def update_params(self, model_id, mode, path, saved_params):
        all_params = self.load_params(model_id)
        filtered_params = filter_params(all_params, mode, path)

        other_params = [p for p in all_params if p not in filtered_params]
        new_params = other_params + saved_params

        return self._make_request("PATCH", f"/models/{model_id}", body={"parameters": new_params})

    def load_params(self, model_id, mode=None, path=None):
        params = self._make_request("GET", f"/models/{model_id}").get("parameters", [])
        if mode and path:  # filter params for a specific editor mode/path
            return filter_params(params, mode, path)
        else:  # no filters
            return params

    def _make_request(self, method, endpoint_path, params=None, body=None):
        endpoint_url = "{}{}".format(DOJO_HOST, endpoint_path)
        print("making a", method, "request to dojo API at", endpoint_url, "with body", body)

        request_fn = getattr(requests, method.lower())
        r = request_fn(endpoint_url, params=params, json=body)
        # print(r.text)

        if r.status_code >= 300:
            print(f" - got {r.status_code} HTTP status code: {r.text}")

        try:
            return r.json()
        except:
            return r.text
