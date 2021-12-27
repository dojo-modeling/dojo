import os
import requests
import json
from fastapi.logger import logger


from src.utils import PluginInterface


class UAZOntologyPlugin(PluginInterface):

    # Define settings as class attributes
    UAZ_URL = os.environ.get("UAZ_URL", "http://linking.cs.arizona.edu/v1")
    UAZ_THRESHOLD = os.environ.get("UAZ_THRESHOLD", 0.6)
    UAZ_HITS = os.environ.get("UAZ_HITS", 10)

    def before_create_model(self, model):
        model = self.get_ontologies(model, type="model"),

    def before_create_indicator(self, indicator):
        indicator = self.get_ontologies(indicator, type="indicator"),

    def on_register_model(self, model):
        logger.info("Updating model with latest ontologies.")
        self.get_ontologies(model, type="model")

    def get_ontologies(self, data, type="indicator"):
        """
        A function to submit either indicators or models to the UAZ
        ontology mapping service

        Params:
            - data: the indicator or model object
            - type: one of either [indicator, model]
        """

        headers = {"accept": "application/json", "Content-Type": "application/json"}
        url = self.UAZ_URL
        uaz_threshold = self.UAZ_THRESHOLD
        uaz_hits = self.UAZ_HITS
        params = f"?maxHits={uaz_hits}&threshold={uaz_threshold}&compositional=true"

        # Send to either /groundIndicator or /groundModel
        if type == "indicator":
            type_ = "groundIndicator"
        elif type == "model":
            type_ = "groundModel"

        # Build final URL to route to UAZ
        url_ = f"{url}/{type_}{params}"

        try:
            logger.debug(f"Sending data to {url}")
            response = requests.put(url_, json=data, headers=headers)
            logger.debug(f"response: {response}")
            logger.debug(f"response reason: {response.raw.reason}")

            # Ensure good response and not an empty response
            if response.status_code == 200:
                resp_str = response.content.decode("utf8")
                uaz_ontologies = json.loads(resp_str)

                try:
                    if type == "indicator":
                        return self.indicator_ontologies(data, uaz_ontologies)
                    else:
                        return self.model_ontologies(data, uaz_ontologies)
                except Exception as e:
                    # If no-go on UAZ, still return partial so it's written to ES
                    logger.error(f"Failed to generate ontologies for indicator: {str(e)}")
                    logger.exception(e)
                    return data

            else:
                logger.debug(f"Failed to fetch ontologies: {response}")
                return data

        except Exception as e:
            logger.error(f"Encountered problems communicating with UAZ service: {e}")
            logger.exception(e)
            return data


    def indicator_ontologies(self, data, ontologies):
        """
        A function to map UAZ ontologies back into
        the submitted "partial" indicator object

        Params:
            - data: the indicator object
            - ontologies: object from UAZ endpoint
        """
        ontology_dict = {"outputs": {}, "qualifier_outputs": {}}

        # Reorganize UAZ response
        for ontology in ontologies["outputs"]:
            ontology_dict["outputs"][ontology["name"]] = ontology["ontologies"]

        for ontology in ontologies["qualifier_outputs"]:
            ontology_dict["qualifier_outputs"][ontology["name"]] = ontology["ontologies"]

        # Map back into partial indicator object to build complete indicator
        for output in data["outputs"]:
            output["ontologies"] = ontology_dict["outputs"][output["name"]]

        if data.get("qualifier_outputs", None):
            for qualifier_output in data["qualifier_outputs"]:
                qualifier_output["ontologies"] = ontology_dict["qualifier_outputs"][qualifier_output["name"]]

        return data


    def model_ontologies(self, data, ontologies):
        """
        A function to map UAZ ontologies back into
        the submitted "partial" model object

        Params:
            - data: the indicator object
            - ontologies: object from UAZ endpoint
        """
        ontology_dict = {"parameters": {}, "outputs": {}, "qualifier_outputs": {}}

        # Reorganize UAZ response
        for ontology in ontologies["outputs"]:
            ontology_dict["outputs"][ontology["name"]] = ontology["ontologies"]

        for ontology in ontologies["qualifier_outputs"]:
            ontology_dict["qualifier_outputs"][ontology["name"]] = ontology["ontologies"]

        for ontology in ontologies["parameters"]:
            ontology_dict["parameters"][ontology["name"]] = ontology["ontologies"]

        # Map back into partial indicator object to build complete indicator
        for parameter in data["parameters"]:
            parameter["ontologies"] = ontology_dict["parameters"][parameter["name"]]

        for output in data.get("outputs", []):
            output["ontologies"] = ontology_dict["outputs"][output["name"]]

        if data.get("qualifier_outputs", None):
            for qualifier_output in data["qualifier_outputs"]:
                qualifier_output["ontologies"] = ontology_dict["qualifier_outputs"][qualifier_output["name"]]

        return data
