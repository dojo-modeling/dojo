SHELL = /bin/bash
LANG = en_US.utf-8
PYTHON = $(shell which python3 || which python)
export LANG

BASEDIR = $(shell pwd)
TERMINAL_DIR = terminal
DOJO_API_DIR = api
DOJO_DMC_DIR = dmc
MIXMASTA_DIR = mixmasta
UI_DIR = ui
RQ_DIR = tasks
WORKERS_DIR = build/workers
COMPOSE_DIRS := $(TERMINAL_DIR) $(DOJO_API_DIR) $(DOJO_DMC_DIR) $(WORKERS_DIR)
COMPOSE_FILES := $(TERMINAL_DIR)/docker-compose.yaml $(DOJO_API_DIR)/docker-compose.yaml \
				 $(DOJO_DMC_DIR)/docker-compose.yaml $(WORKERS_DIR)/docker-compose.yaml \
				 $(RQ_DIR)/docker-compose.yaml
TEMP_COMPOSE_FILES := $(foreach file,$(subst /,_,$(COMPOSE_FILES)),temp_$(file))
IMAGE_NAMES = api terminal ui tasks
BUILD_FILES = $(wildcard */.build)
BUILD_DIRS = $(dir $(BUILD_FILES))


.PHONY:update
update:
	git pull && \
	$(PYTHON) $(BASEDIR)/bin/update_envfile.py envfile.sample envfile;

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

.PHONY:static
static:docker-compose.yaml ui/node_modules ui/package-lock.json ui/package.json
	( cd ui && rm -fr dist/; NODE_OPTIONS="--openssl-legacy-provider" npm run build)

.PHONY:images
images:static
	for dir in $(BUILD_DIRS); do \
		(cd $${dir} && bash .build); \
	done

.PHONY:clean
clean:
	echo "Clearing all transient data" && \
	docker image prune -f && \
	docker container prune -f && \
	docker-compose run app rm -r ./data/*/ && \
	echo "Done"

terminal/.dockerenv:
	touch terminal/.dockerenv

docker-compose.yaml:$(COMPOSE_FILES) docker-compose.build-override.yaml terminal/.dockerenv envfile
	export $$(grep -v '^#' envfile | xargs); \
	export AWS_SECRET_ACCESS_KEY_ENCODED=$$(echo -n $${AWS_SECRET_ACCESS_KEY} | \
		curl -Gso /dev/null -w %{url_effective} --data-urlencode @- "" | cut -c 3-); \
	if [[ -z  "$${DOCKERHUB_AUTH}" ]]; then \
		export DOCKERHUB_AUTH="$$(echo '{"username":"'$${DOCKERHUB_USER}'","password":"'$${DOCKERHUB_PWD}'","email":"'$${DOCKERHUB_EMAIL}'"}' | base64 | tr -d '\n')"; \
	fi; \
	for compose_file in $(COMPOSE_FILES); do \
	  	tempfile="temp_$${compose_file//\//_}"; \
  		docker-compose -f $$compose_file config > $$tempfile; \
  	done; \
	sed -E -i'.sedbkp' -f .dmc.sed temp_dmc_docker-compose.yaml; \
	docker-compose --env-file envfile $(foreach f,$(TEMP_COMPOSE_FILES), -f $(f)) \
	  	-f docker-compose.build-override.yaml config > docker-compose.yaml; \
	rm $(TEMP_COMPOSE_FILES) *.sedbkp;


ui/package-lock.json:ui/package.json
	docker-compose run ui npm i -y --package-lock-only

ui/node_modules:ui/package-lock.json | 
	docker-compose run ui npm ci -y

.PHONY:up
up:docker-compose.yaml ui/node_modules
	docker-compose up -d

.PHONY:up-rebuild
up-rebuild:docker-compose.yaml ui/node_modules
	docker-compose up --build -d

.PHONY:down
down:docker-compose.yaml
	docker-compose down


.PHONY:restart
restart:docker-compose.yaml
	make down && make up


.PHONY:logs
logs:
	docker-compose logs -f --tail=30

.PHONY:build-dev-image
build-dev-image:
	docker-compose exec docker /bin/bash -c "cd /build && ./build-dev-image"
