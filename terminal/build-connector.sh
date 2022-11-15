#!/usr/bin/env sh

DT=$(date +"%Y%m%d")
BUILD_TIME=$(date +%FT%T%Z)
COMMIT=$(git rev-parse --short HEAD)
GIT=${DT}.git.${COMMIT}
PROJECT="connector"
VERSION="1.0.0"
TAG="${PROJECT}_${VERSION}"

GROUP=dojo-modeling
NAME=terminal-connector
IMAGE="${GROUP}/${NAME}"

docker build --no-cache -f connector/Dockerfile \
       --build-arg TERMINAL_VERSION="${VERSION}" \
       --build-arg TERMINAL_BUILD="${DT}" \
       --build-arg TERMINAL_COMMIT="${COMMIT}" \
       -t "${IMAGE}:${PROJECT}-dev" \
       -t "${IMAGE}:${TAG}" \
       -t "${IMAGE}:${TAG}-dev" \
       -t "${IMAGE}:${GIT}" \
       connector/
