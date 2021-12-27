#!/usr/bin/env sh

DT=$(date +"%Y%m%d")
COMMIT=$(git rev-parse --short HEAD)
GIT=${DT}.git.${COMMIT}
PROJECT="connector"
VERSION="0.1.0"
TAG="${VERSION}"

GROUP=dojomodeling
NAME=terminal-connector
IMAGE="${GROUP}/${NAME}"

docker build -f connector/Dockerfile \
       --build-arg TERMINAL_VERSION="0.1.0"
       --build-arg TERMINAL_BUILD=${DT} \
       --build-arg TERMINAL_COMMIT=${COMMIT} \
       -t "${IMAGE}:${PROJECT}-latest" \
       -t "${IMAGE}:${PROJECT}-dev" \
       -t "${IMAGE}:${TAG}" \
       -t "${IMAGE}:${TAG}-dev" \
       -t "${IMAGE}:${GIT}" \
       -t "${IMAGE}:latest" \
       connector/
