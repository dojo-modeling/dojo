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
from django.urls import path, include
from .table import Table
from .annotation import Annotation
from . import proxy_views
from . import submit_views
from processing.views import PreviewLoader, PreviewStatus
from processing.views import SubmissionProcessing, SubmissionStatus

urlpatterns = [
    path("/<uuid>", Table.as_view(), name="table"),
    path("/annotate/<uuid>", Annotation.as_view()),
    path("/proxy/date/<uuid>/<col>", proxy_views.date_validation),
    path("/proxy/sheets", proxy_views.excel_sheets),
    path("/proxy/bands", proxy_views.geotiff_bands),
    path("/submit/<uuid>", submit_views.submit_table),
    path("/submit/send/<uuid>", SubmissionProcessing.as_view()),
    path("/submit/send/<uuid>/done", submit_views.success_page),
    path("/submit/send/<uuid>/status", SubmissionStatus.as_view()),
    path("/transform_loading/<uuid>", PreviewLoader.as_view()),
    path("/transform_loading/<uuid>/status", PreviewStatus.as_view()),
    path("/preview-status/<uuid>", PreviewStatus.as_view()),
    path("/version", proxy_views.handle_init_version),
]
