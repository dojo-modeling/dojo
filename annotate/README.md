## Quick-Start

Ensure you are running the Dojo API. **Note**: you can use `dojo-test.com` if need be, but will need to uncomment and provide credentials in the `.env` which should be `DOJO_USERNAME` and `DOJO_PASSWORD`. If you do this, please use dataset names that are easy to track down when we periodically sanitize the database of our testing data.

1. Copy `env_example` to `.env` and insert the appropriate values.
2. Create conda env with python 3.8.x

	```
	conda create -n <env name> python=3.8
	```
3. run:

	```
	pip install -r requirements.txt
	```
4. Launch Annotate with port of choice:

	```
	python manage.py runserver 8001
	```	
5. Go to:

	```
	http://localhost:8001/
	```	
## Caching GADM files

You can optionally pre-cache GADM files to speed up data transformations by setting `CACHE_GADM` in `.env` to `true`.

## Redis Cache

Redis is used as a cache. If running the entire suite with `docker-compose`, you can use the default value for `REDIS_HOST` in the example `.env` file. If you are running Annotate in the foreground with gunicorn/`manage.py` you should update that string to `localip:6382` or `127.0.0.1:6382`, etc.

## Docker Installation

You should ensure that you have an up to date `.env` file. Run `docker-compose up -d --build`.
