SHELL = /bin/bash
LANG = en_US.utf-8
PYTHON = $(shell which python3 || which python)
export LANG

BASEDIR = $(shell pwd)
COMPOSE_FILES := annotate/docker-compose.dev.yaml api/docker-compose.yaml build/workers/docker-compose.yaml \
		templater/docker-compose.yaml terminal/docker-compose.yaml #  ui/docker-compose.yaml
TEMP_COMPOSE_FILES := $(foreach file,$(subst /,_,$(COMPOSE_FILES)),temp_$(file))


.PHONY:update
update:
	git pull && \
	$(PYTHON) $(BASEDIR)/build/bin/update_envfile.py envfile.sample envfile;

.PHONY:init
init:
	make envfile;

.PHONY:rebuild-all
rebuild-all:
	docker-compose build --no-cache; \
	cd $(MIXMASTA_DIR) && docker build . -t mixmasta:dev;

envfile:
ifeq ($(wildcard envfile),)  # If file "envfile" doesn't exist
	cp envfile.sample envfile; \
	echo -e "\nDon't forget to update 'envfile' with all your secrets!";
endif


.PHONY:clean
clean:
	echo "Clearing all transient data" && \
	docker image prune -f && \
	docker container prune -f && \
	docker-compose run app rm -r ./data/*/ && \
	echo "Done"


docker-compose.yaml:$(COMPOSE_FILES) docker-compose.build-override.yaml envfile
	export $$(cat envfile | xargs); \
	export AWS_SECRET_ACCESS_KEY_ENCODED=$$(echo -n $${AWS_SECRET_ACCESS_KEY} | \
		curl -Gso /dev/null -w %{url_effective} --data-urlencode @- "" | cut -c 3-); \
	if [[ -z  "$${DOCKERHUB_AUTH}" ]]; then \
		export DOCKERHUB_AUTH="$$(echo '{"username":"'$${DOCKERHUB_USER}'","password":"'$${DOCKERHUB_PWD}'","email":"'$${DOCKERHUB_EMAIL}'"}' | base64 | tr -d '\n')"; \
	fi; \
	for compose_file in $(COMPOSE_FILES); do \
	  	tempfile="temp_$${compose_file//\//_}"; \
  		docker-compose -f $$compose_file config > $$tempfile; \
  	done; \
	docker-compose --env-file envfile $(foreach f,$(TEMP_COMPOSE_FILES), -f $(f)) \
	  	-f docker-compose.build-override.yaml config > docker-compose.yaml; \
	rm $(TEMP_COMPOSE_FILES);


ui/node_modules:docker-compose.yaml
	docker-compose run ui npm install -y --production=false


.PHONY:up
up:docker-compose.yaml ui/node_modules
	docker-compose up -d; \
	make pull-images


.PHONY:down
down:docker-compose.yaml
	docker-compose down


.PHONY:restart
restart:docker-compose.yaml
	make down && make up


.PHONY:logs
logs:
	docker-compose logs -f --tail=30


.PHONY:pull-images
pull-images:
	docker-compose exec docker /bin/bash -c "cd /build && ./pull-images"


.PHONY:create-es-indexes
create-es-indexes:
	curl -s -X PUT http://localhost:9200/accessories > /dev/null; \
		curl -s -X PUT http://localhost:9200/configs > /dev/null; \
		curl -s -X PUT http://localhost:9200/directives > /dev/null; \
		curl -s -X PUT http://localhost:9200/indicators > /dev/null; \
		curl -s -X PUT http://localhost:9200/models > /dev/null; \
		curl -s -X PUT http://localhost:9200/outputfiles > /dev/null; \
		curl -s -X PUT http://localhost:9200/runs > /dev/null;
