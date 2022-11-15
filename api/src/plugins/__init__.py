from typing import Dict, Iterator, Tuple

from fastapi.logger import logger


def plugin_action(action_name, **kwargs):
    from src.settings import settings

    for plugin_name, plugin in settings.PLUGINS.items():
        action = getattr(plugin, action_name, None)
        if action:
            logger.debug(f"Triggering {plugin_name} action {action_name} with args {kwargs}")
            action(**kwargs)


class PluginHandler:

    def __init__(self, plugins: Dict[str, str]) -> None:
        self.registered_plugins = plugins
        self.instantiated_plugins = {}

    def items(self) -> Iterator[Tuple[str, object]]:
        return iter((k, self[k]) for k in self.registered_plugins.keys())

    def get(self, name, default=None):
        if name in self.registered_plugins:
            return self[name]
        else:
            return default

    def __getitem__(self, __key: str) -> object:
        if __key in self.registered_plugins:
            if __key in self.instantiated_plugins:
                return self.instantiated_plugins[__key]
            else:
                # Manually import class from the provided string and instantiate
                mod, cls = self.registered_plugins[__key].rsplit('.', 1)
                mod = __import__(mod, globals(), locals(), [cls])
                cls = getattr(mod, cls)
                instance = cls()
                # Save instantiated instance for future use
                self.instantiated_plugins[__key] = instance
                return instance
        else:
            raise KeyError(f"'{__key}' is not a registered plugin.")


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