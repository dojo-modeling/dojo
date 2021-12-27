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
from byod.views import download_csv, GeotimeAnalyzeLoader, GeotimeAnalyzeStatus, MaintainerView
from byom.views import SplashView
from process.proxy_views import handle_init_version

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", MaintainerView.as_view()),
    # path("loading", loading),
    path("analyze/<uuid>", GeotimeAnalyzeLoader.as_view()),
    path("analyze/<uuid>/status", GeotimeAnalyzeStatus.as_view()),
    path("overview", include("process.urls")),
    # path("byom", splash),
    path("byom", SplashView.as_view()),
    path("download/<uuid>", download_csv),
    path('django-rq/', include('django_rq.urls')),
    path("version", handle_init_version),
]

# path("byom", SplashView.as_view()),
