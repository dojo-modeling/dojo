# my_app/app_config.py
from django.apps import AppConfig
from django.conf import settings
import logging
import json
from mixmasta import mixmasta as mix


logger = logging.getLogger(__name__)


class GADMLoaderConfig(AppConfig):
    name = "gadm"
    verbose_name = "gadm loader"

    def ready(self):
        if settings.CACHE_GADM:
            logger.info("Loading GADM from Mixmasta...")
            mixdata = mix.mixdata()
            mixdata.load_gadm3()
            mixdata.load_gadm2()
            logger.info("...GADM loading completed.")

            global gadm3
            gadm3 = mixdata.gadm3

            global gadm2
            gadm2 = mixdata.gadm2
        else:
            pass

    def gadm3(self):
        if settings.CACHE_GADM:
            return gadm3
        else:
            pass

    def gadm2(self):
        if settings.CACHE_GADM:
            return gadm2
        else:
            pass
