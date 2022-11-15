# Domain Model Controller

The Domain Model Controller (DMC), is an implementation of Airflow designed to support black box model execution, normalization, and storage.

## Contents

1. [Setup](#setup)
2. [Running a Model](#running-a-model)
3. [Concurrency and parallel model runs](#concurrency-and-parallel-model-runs)
4. [Airflow REST API](#airflow-rest-api)

## Setup

This assumes you are already running the Dojo API locally. First, you must set environment variables for the AWS access and secret keys in order to be able to push results to S3:

```
export AWS_ACCESS_KEY=youraccesskey
export AWS_SECRET_KEY=yoursecretkey
```

> **Note**: you must **URL encode** your access and secret keys before setting the environment variables

Then run: 

```
set -a
source .env
```

Now, DMC can be run via `docker-compose` with:

```
docker-compose up -d
```

You can validate docker api is working after `docker-compose` has started with
```
curl localhost:8375/containers/json
```

You'll need to make the following permissions change:

```
sudo chmod -R +777 logs mappers results model_configs
```

to enable Airflow to control Docker containers.

If using Docker Desktop (e.g. on Mac) you may need to open the `Preferences` and **disable** `Use gRPC FUSE for file sharing`.

To change the authentification username and password adjust the following in the `docker-compose.yaml`:

```
_AIRFLOW_WWW_USER_USERNAME: {your_username}
_AIRFLOW_WWW_USER_PASSWORD: {your_password}
```

> Note: these should be changed for production; the above credentials are the default.

Set the `DMC_DEBUG` environment variable in the `.env` to `'false'` if you are running in production, otherwise leave it as `'true'`. If `'false'`, a notification may be sent to external services to let them know the model run as completed. We **don't** want to do this when developing the application.

This should run the Airflow UI at `http://localhost:8080/home`.

## Running a Model

To run a model, navigate to the top of this repository. `cd models` and pick a model of interest. Register that model. Typically you run `modelname.py`. This assumes Dojo and DMC are both running. 

Note: DMC and Dojo both require Redis; these `docker-compose` Redis instances may port collide so it could be necessary to resolve this by:

1. `api/src/settings.py`: change `REDIS_PORT` to `6380`
2. `api/docker-compose.yaml`: change line 47 to `6380:6379`
3. Delete any lingering or old Elasticsearch volumes associated with Dojo API (unless they have something you wish to save--in that case back them up).

Now that both systems are running and you've registered a model, send the example run `modelname_run.json` to the `/runs` Dojo endpoint. You can track the run via the DAG explorer in Airflow.

## Concurrency and parallel model runs

Concurrency in airflow is handled by two DAG level configurations. These are set in `docker-compose.yaml` on lines 64 and 65 and then read by the DAG (`model-xform.py` lines 48-49):

1. `DAG_MAX_ACTIVE_RUNS`: maximum number of active runs for this DAG. The scheduler will not create new active DAG runs once this limit is hit. Defaults to core.max_active_runs_per_dag if not set
2. `DAG_CONCURRENCY`: the number of task instances allowed to run concurrently across all active runs of the DAG this is set on. Defaults to core.dag_concurrency if not set

Setting the `DAG_MAX_ACTIVE_RUNS` parameter is arguably more important than concurrency. It is currently set to `3`. This means that `3` model runs can be executed in parallel. 

Within each model run there are a number of tasks (fetch model config, run model, run mixmasta, write to S3, etc). Since none of these inter-model run tasks are running in parallel, the `DAG_CONCURRENCY` argument is less important: it limits the total tasks that can run across the DAG. 


## Airflow REST API

This is enabled on line 52 of `docker-compose.yaml`. The API reference can be found [here](http://apache-airflow-docs.s3-website.eu-central-1.amazonaws.com/docs/apache-airflow/latest/stable-rest-api-ref.html#operation/get_config). You can run commands like:


```
curl 'localhost:8080/api/v1/dags' \
-H 'Content-Type: application/json' \
--user "jataware:wileyhippo"
```
