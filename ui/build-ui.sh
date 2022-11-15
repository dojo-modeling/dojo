#!/usr/bin/env sh

DT=$(date +"%Y%m%d")
GIT=${DT}.git.$(git rev-parse --short HEAD)
VERSION="1.0.0"
TAG="${VERSION}"

GROUP=dojo-modeling
NAME=dojo-ui
IMAGE="${GROUP}/${NAME}"

docker build -f deploy/Dockerfile \
       -t "${IMAGE}:dev" \
       -t "${IMAGE}:${TAG}" \
       -t "${IMAGE}:${TAG}-dev" \
       -t "${IMAGE}:${GIT}" \
       .
