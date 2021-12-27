

# Dependencies

# gnumake curl git
# docker docker-compose

VERSION := 0.1.0

DEV ?= $(strip $(if $(findstring y,$(prod)),,dev))

VERSION := ${VERSION}$(DEV:dev=-dev)

DETECTED_OS := $(shell uname)

CMD_ARGUMENTS ?= $(cmd)

.DEFAULT_GOAL := help

check-%:
	@: $(if $(value $*),,$(error $* is undefined))

help:
	@echo ""
	@echo "By default make targets assume DEV to run production pass in prod=y as a command line argument"
	@echo ""
	@echo "Targets:"
	@echo ""
	@grep -E '^([a-zA-Z_-])+%*:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-40s\033[0m %s\n", $$1, $$2}'

ip-addr:
ifeq ($(DETECTED_OS),Darwin) # Mac OS X
	$(eval ip_address=$(shell ipconfig getifaddr en0))
else
	$(eval ip_address=$(shell hostname -i))
endif

.PHONE: ip
ip:| ip-addr
	@echo ${ip_address}

.PHONY: docker_build
docker_build: docker_build-ui  ## Build all docker containers

.PHONY: docker_build-ui
docker_build-ui: | npm_build ## Build ui container
	./build-ui.sh


.PHONY: docker_login-dockerhub
docker_login-dockerhub:| check-DOCKERHUB_USER check-DOCKERHUB_PASS  ## Login to docker registery. Requires DOCKERHUB_USER and DOCKERHUB_PASS to be set in the environment
	@printf "${DOCKERHUB_PASS}\n" | docker login -u "${DOCKERHUB_USER}" --password-stdin

.PHONY: docker_push-dockerhub
docker_push-dockerhub: docker_push-ui | docker_login-dockerhub  ## Push all containers to docker registry

docker_push-%:| docker_login-dockerhub
	@echo "push $* ${VERSION}"
	docker push "dojo/dojo-ui:${VERSION}"

.PHONY: npm_lint
npm_lint:   ## Format js files
	npm run lint

.PHONY: npm_build
npm_build:  ## Build npm package
	npm run build

.PHONY: fmt
fmt:| npm_lint ## Format all

.PHONY: compile
compile:| npm_build ## Compile all builds

.PHONY: npm_run_dev
npm_run_dev:  ## Dev - run react dev server locally
	npm run dev

.PHONY: cypress_open
cypress_open: ## Opens Cypress E2E testing app
	npx cypress open

.PHONY: docker-compose_up
docker-compose_up:|ip-addr  ## Dev - run local cluster
	PRIVATE_IP=${ip_address} docker compose up --force-recreate

