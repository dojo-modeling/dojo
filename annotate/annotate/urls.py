"""annotate URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from annotation.proxy_views import handle_init_version
from metadata_collection.indicator import Indicator
from metadata_collection.load_data import LoadData
from metadata_collection.model_output import ModelOutput
from metadata_collection.helper_functions import download_csv
from processing.views import PreProcessing, PreProcessingStatus

urlpatterns = [
    path("admin/", admin.site.urls),
    path("analyze/<uuid>", PreProcessing.as_view()),
    path("analyze/<uuid>/status", PreProcessingStatus.as_view()),
    path("overview", include("annotation.urls")),
    path("byom", ModelOutput.as_view()),
    path("model-output", ModelOutput.as_view()),
    path("", Indicator.as_view()),
    path("model_output", ModelOutput.as_view()),
    #path("load-data", LoadData.as_view()),
    path("download/<uuid>", download_csv),
    path("django-rq/", include("django_rq.urls")),
    path("version", handle_init_version),
]

# path("byom", SplashView.as_view()),
