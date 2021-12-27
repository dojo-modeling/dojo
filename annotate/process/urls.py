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
from . import annotation_views
from . import table_views
from . import proxy_views
from . import submit_views

urlpatterns = [
    path("/<uuid>", table_views.review_table),
    path("/annotate/<uuid>", annotation_views.annotate_column),
    path("/proxy/date/<uuid>/<col>", proxy_views.date_validation),
    path("/proxy/sheets", proxy_views.excel_sheets),
    path("/proxy/bands", proxy_views.geotiff_bands),
    path("/submit/<uuid>", submit_views.submit_table),
    path("/submit/send/<uuid>", submit_views.dojo_submit),
    path("/transform_loading/<uuid>", submit_views.PreviewLoader.as_view()),
    path("/transform_loading/<uuid>/status", submit_views.PreviewStatus.as_view()),
    path("/preview-status/<uuid>", submit_views.PreviewStatus.as_view()),
    path("/version", proxy_views.handle_init_version),
]
