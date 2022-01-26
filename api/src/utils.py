from dojo.api.src.models import current_milli_time
from validation import ModelSchema
from fastapi.logger import logger
import time
from elasticsearch import Elasticsearch

from src.settings import settings
es = Elasticsearch([settings.ELASTICSEARCH_URL], port=settings.ELASTICSEARCH_PORT)


def try_parse_int(s: str, default: int = 0) -> int:
    try:
        return int(s)
    except ValueError:
        return default

def delete_matching_records_from_model(model_id, record_key, record_test):
    """
    This function provides an easy way to remove information from within a specific key of a model.

    - model_id: the id of the model that we should be removing information from
    - record_key: the key of the model that we should look in to remove data (ie "parameters", "outputs")
    - record_test: a function that will run on each of the records within the record_key to see whether
        they should be deleted. record_test() should return True if this record is to be deleted
    """

    from src.models import get_model, modify_model  # import at runtime to avoid circular import error
    record_count = 0

    model = get_model(model_id)
    records = model.get(record_key, [])
    records_to_delete = []
    for record in records:
        if record_test(record):
            records_to_delete.append(record)

    for record in records_to_delete:
        record_count += 1
        records.remove(record)

    update = { record_key: records }
    modify_model(model_id, ModelSchema.ModelMetadataPatchSchema(**update))

    return record_count


def run_model_with_defaults(model_id):
    """
    This function takes in a model and submits a default run to test that model's functionality
    """

    from src.models import get_model 
    from src.runs import create_run, current_milli_time
    from validation import RunSchema

    model = get_model(model_id)

    params = []
    for param in model.get("parameters",[]):
        param_obj = {}
        param_obj['name'] = param['name']
        param_obj['value'] = param['default']
        params.append(param_obj)
    
    run_id = f"{model['name']}-{current_milli_time()}"

    run = RunSchema(id=run_id,
                    model_id=model_id,
                    model_name=model["name"],
                    parameters=params,
                    is_default_run=True,
                    created_at = current_milli_time())

    create_run(run)

    # Store model ID to `tests` index with `status` set to `running`
    body = {"status": "running", "created_at": run.created_at, "run_id": run.id}
    es.index(index="tests", body=body, id=model_id)

    return run_id


def plugin_action(action_name, **kwargs):
    from src.settings import settings

    for plugin_name, plugin in settings.PLUGINS.items():
        action = getattr(plugin, action_name, None)
        if action:
            logger.debug(f"Triggering {plugin_name} action {action_name} with args {kwargs}")
            action(**kwargs)


class PluginInterface:
    """
        Interface 
    """
    
    def before_create(self, data, type):
        pass

    def post_create(self, data, type):
        pass

    def before_update(self, data, type):
        pass

    def post_update(self, data, type):
        pass

    def before_register(self, data, type):
        pass

    def register(self, data, type):
        pass

    def post_register(self, data, type):
        pass

    def before_publish(self, data, type):
        pass

    def publish(self, data, type):
        pass

    def post_publish(self, data, type):
        pass

    def pre_run_model(self, model, run_id):
        pass

    def run_model(self, model, run_id):
        pass

    def post_run_model(self, model, run_id):
        pass


    def on_run_success(self, model, run_id):
        pass

    def on_run_failure(self, model, run_id):
        pass
