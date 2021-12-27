from fastapi.logger import logger

from src.utils import PluginInterface


class LoggingPlugin(PluginInterface):
    """
        Sample plugin that performs logging via the fastapi logger
    """

    def before_create(self, data, type):
        logger.info("before_create; data=%s; type=%s", data, type)

    def post_create(self, data, type):
        logger.info("post_create; data=%s; type=%s", data, type)

    def before_update(self, data, type):
        logger.info("before_update; data=%s; type=%s", data, type)

    def post_update(self, data, type):
        logger.info("post_update; data=%s; type=%s", data, type)

    def before_register(self, data, type):
        logger.info("before_register; data=%s; type=%s", data, type)

    def register(self, data, type):
        logger.info("register; data=%s; type=%s", data, type)

    def post_register(self, data, type):
        logger.info("post_register; data=%s; type=%s", data, type)

    def before_publish(self, data, type):
        logger.info("before_publish; data=%s; type=%s", data, type)

    def publish(self, data, type):
        logger.info("publish; data=%s; type=%s", data, type)

    def post_publish(self, data, type):
        logger.info("post_publish; data=%s; type=%s", data, type)

    def pre_run_model(self, model, run_id):
        logger.info("pre_run_model; model=%s; run_id=%s", model, run_id)

    def run_model(self, model, run_id):
        logger.info("run_model; model=%s; run_id=%s", model, run_id)

    def post_run_model(self, model, run_id):
        logger.info("post_run_model; model=%s; run_id=%s", model, run_id)

    def on_run_success(self, model, run_id):
        logger.info("on_run_success; model=%s; run_id=%s", model, run_id)

    def on_run_failure(self, model, run_id):
        logger.info("on_run_failure; model=%s; run_id=%s", model, run_id)
