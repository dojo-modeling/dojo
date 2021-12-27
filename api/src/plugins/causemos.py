import copy
import requests
import json
import os
from fastapi.logger import logger

from src.utils import PluginInterface


class CausemosPlugin(PluginInterface):

    def on_register_model(self, model):
        from src.settings import settings
        from .models import model_versions

        if settings.DEBUG:
            return

        notify_data = copy.deepcopy(model)

        # On the notification step only, we want to include any previous versions so that they can be deprecated
        previous_versions = model_versions(model["id"])['prev_versions']
        notify_data["deprecatesIDs"] = previous_versions

        # Notify causemos of the new model
        self.notify_causemos(data=model, type="model")

        # Send CauseMos a default run
        logger.info("Submitting defualt run to CauseMos")
        self.submit_run(model)

    def on_register_indicator(self, indicator):
        from src.settings import settings

        if settings.DEBUG:
            return

        # Notify causemos of the new indicator
        logger.info("causemos indicator", json.dumps(indicator, indent=2))
        self.notify_causemos(data=indicator, type="indicator")

    def notify_causemos(self, data, type="indicator"):
        """
        A function to notify Causemos that a new indicator or model has been created.

        If type is "indicator":
            POST https://causemos.uncharted.software/api/maas/indicators/post-process
            // Request body: indicator metadata

        If type is "model":
            POST https://causemos.uncharted.software/api/maas/datacubes
            // Request body: model metadata
        """
        headers = {"accept": "application/json", "Content-Type": "application/json"}

        if type == "indicator":
            endpoint = "indicators/post-process"
        elif type == "model":
            endpoint = "datacubes"

        url = f'{os.getenv("CAUSEMOS_IND_URL")}/{endpoint}'
        causemos_user = os.getenv("CAUSEMOS_USER")
        causemos_pwd = os.getenv("CAUSEMOS_PWD")

        try:
            # Notify Uncharted
            if os.getenv("CAUSEMOS_DEBUG") == "true":
                logger.info("CauseMos debug mode: no need to notify Uncharted")
                return
            else:
                logger.info(f"Notifying CauseMos of {type} creation...")
                response = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=data,
                    auth=(causemos_user, causemos_pwd),
                )
                logger.info(f"Response from Uncharted: {response.text}")
                return

        except Exception as e:
            logger.error(f"Encountered problems communicating with Causemos: {e}")
            logger.exception(e)


    def submit_run(self, model):
        """
        This function takes in a model and submits a default run for that model to CauseMos

        POST https://causemos.uncharted.software/api/maas/model-runs
        // The request body must at a minimum include
        {
        model_id,
        model_name,
        parameters,
        is_default_run = true
        }
        """

        headers = {"accept": "application/json", "Content-Type": "application/json"}
        endpoint = "model-runs"
        url = f'{os.getenv("CAUSEMOS_IND_URL")}/{endpoint}'
        causemos_user = os.getenv("CAUSEMOS_USER")
        causemos_pwd = os.getenv("CAUSEMOS_PWD")

        params = []
        for param in model.get("parameters",[]):
            param_obj = {}
            param_obj['name'] = param['name']
            param_obj['value'] = param['default']
            params.append(param_obj)

        payload = {"model_id": model["id"],
                "model_name": model["name"],
                "is_default_run": True,
                "parameters": params}

        try:
            # Notify Uncharted
            if os.getenv("CAUSEMOS_DEBUG") == "true":
                logger.info("CauseMos debug mode: no need to submit default model run to Uncharted")
                return
            else:
                logger.info(f"Submitting default model run to CauseMos with payload: {payload}")
                response = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    auth=(causemos_user, causemos_pwd),
                )
                logger.info(f"Response from Uncharted: {response.text}")
                return

        except Exception as e:
            logger.error(f"Encountered problems communicating with Causemos: {e}")
            logger.exception(e)
