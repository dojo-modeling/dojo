# Dojo integrated development environment


This repo provides the following services, each of which is stored in a sub-directory 

* **API** - Python based FastAPI back-end
* **Tasks** - RQ task/job service for batch operations and data processing
* **Terminal** - Provides an interface to allow manipulation of the inside 
  of a docker container via a web interface over a websocket
* **DMC (Domain Model Controller)** - Apache Airflow based system for 
  running models and collecting results and artifacts
* **UI** - React interface that ties the system together

<br>


The following services are also required:

* [Elasticsearch](https://www.elastic.co/elasticsearch/)
* [Redis](https://redis.io/)

<br>

The services can be run on a single server, or can be deploy in a distributed fashion.


## Local development

For convenient testing and development, the entire stack runs via Docker and comes with a make file
which will compile the various services in to a single docker-compose stack and ensure that your
requirements are all up-to-date.

Please review the targets in the Makefile for further information.


### Install/Setup


1. Clone repo
2. Run `$ make init` to ensure environment is properly configured
3. Add your secrets to the file `envfile`  
  - Create a (Dockerhub)[https://hub.docker.com/] account, if needed.
  - Have properly restricted AWS keys, scoped to this project, handy. Or request on Jataware's Slack.
  - envfile secrets updates:
```
DOCKERHUB_USER=your-dockerhub-username
DOCKERHUB_PWD=your-saved-access-token

AWS_ACCESS_KEY_ID=keys-by-admin
AWS_SECRET_KEY=secret-key-by-admin
```
-- NOTE: For local development or testing you should rarely, if ever, need to change any of the host names or ports. You should really only need to set the variables that are wrapped in `${...}`

4. Run `$ make up` to build and bring online all services
5. Setup is complete

### Running locally

To start all services: `$ make up`

To stop all services: `$ make down`

To view logs: `$ make logs` or `$ docker-compose logs {service-name}`


### Endpoints

* Dojo UI: http://localhost:8080/
* Dojo API: http://localhost:8000/
* Terminal API: http://localhost:3000/
* Elasticsearch: http://localhost:9200/
* Redis: http://localhost:6379/
* DMC (Airflow): http://localhost:8090/


