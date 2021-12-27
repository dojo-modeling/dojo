#!/usr/bin/env sh

DT=$(date +"%Y%m%d")
GIT=${DT}.git.$(git rev-parse --short HEAD)
VERSION="0.1.0"
TAG="${VERSION}"

GROUP=dojomodeling
NAME=dojo-ui
IMAGE="${GROUP}/${NAME}"

docker build -f Dockerfile \
       -t "${IMAGE}:dev" \
       -t "${IMAGE}:${TAG}" \
       -t "${IMAGE}:${TAG}-dev" \
       -t "${IMAGE}:${GIT}" \
       -t "${IMAGE}:latest" \
       .
