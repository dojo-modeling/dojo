"""
Django settings for annotate project.

Generated by 'django-admin startproject' using Django 2.1.3.

For more information on this file, see
https://docs.djangoproject.com/en/2.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.1/ref/settings/
"""

import os

# Settings from environmental variables
ANNOTATION_S3_BUCKET = os.environ.get("ANNOTATION_S3_BUCKET", "YOUR S3 BUCKET")
ANNOTATION_S3_PATH = os.environ.get("ANNOTATION_S3_PATH", "dev/indicators")
DOJO_URL = os.environ.get("DOJO_URL", "http://DOJO_URL.COM")
UI_URL = os.environ.get("UI_URL",  "http://localhost:8080")
DOJO_USERNAME = os.environ.get("DOJO_USERNAME", None)
DOJO_PASSWORD = os.environ.get("DOJO_PASSWORD", None)
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "AWS ACCESS KEY GOES HERE")
AWS_SECRET_ACCESS_KEY = os.environ.get(
    "AWS_SECRET_ACCESS_KEY", "AWS SECRET KEY GOES HERE"
)
DJANGO_LOG_LEVEL = os.environ.get("DJANGO_LOG_LEVEL", "INFO")
TERMINAL_API_ENDPOINT = os.environ.get("TERMINAL_API_ENDPOINT", "http://localhost:3000")
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}"
CACHE_GADM = os.environ.get("CACHE_GADM", "false").lower() == "true"


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

X_FRAME_OPTIONS = "SAMEORIGIN"
# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "612k9x!bbcg+v4q@!p0og9dltusg64-fz^5%&otd$)bg)p6gw5"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "localhost:8001",
    "localhost:8000",
    "data.dojo.dev.t.x",
    "data.dojo-test.com",
    "dojo-test.com",
    "annotate",
    "annotate.dojo",
]

# Application definition

INSTALLED_APPS = [
    "gadm.GADMLoaderConfig",
    "metadata_collection",
    "annotation",
    "tasks",
    "django_rq",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "annotate.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "annotate.wsgi.application"


# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR) + "/db.sqlite3",
    }
}


# Password validation
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/

STATIC_URL = "/static/"
# STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATICFILES_DIRS = (os.path.join(BASE_DIR, "static/"),)


def skip_date_validation(record):
    # if record.args[0].startswith('GET /overview/proxy/date'):
    #         return False
    return True


CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{REDIS_URL}/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "annotate",
    }
}

RQ_QUEUES = {
    "default": {
        "URL": f"{REDIS_URL}/1",
        "DEFAULT_TIMEOUT": 1200,  # 20 minutes
    },
}

LOGGING = {
    "version": 1,
    "formatters": {
        "fmt": {
            "format": "%(asctime)s %(levelname)s %(module)s %(funcName)s %(msg)s",
            "datefmt": "[%d/%b/%Y %H:%M:%S]",
        },
    },
    "filters": {
        "skip_date_validation": {
            "()": "django.utils.log.CallbackFilter",
            "callback": skip_date_validation,
        }
    },
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "fmt",
            "level": DJANGO_LOG_LEVEL,
            "filters": ["skip_date_validation"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": DJANGO_LOG_LEVEL,
        "formatter": "fmt",
        "filters": ["skip_date_validation"],
    },
}
