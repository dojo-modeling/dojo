FROM golang:1.17-buster AS build

RUN apt-get install gcc g++ make git

WORKDIR /src
COPY ./api/server ./server
COPY ./connector .

ARG TERMINAL_VERSION
ARG TERMINAL_BUILD
ARG TERMINAL_COMMIT

RUN mkdir -p /out/embedded

WORKDIR /src/server
RUN GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w" \
        -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
        -o /out/api main.go

WORKDIR /src/preexec
RUN GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w" \
        -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
              -o /out/embedded/dojo-preexec main.go

WORKDIR /src/cli
RUN GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w" \
        -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
              -o /out/embedded/dojo main.go

WORKDIR /src/embedded
RUN GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w" \
        -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
              -o /out/embedded/connector .

WORKDIR /src/
RUN cp -r sshd/. /out/embedded

WORKDIR /out
RUN tar czvf pkg.tgz -C embedded/ .

FROM debian:10-slim

WORKDIR /usr/bin
COPY --from=build /out/api .

RUN useradd --user-group --create-home app

COPY --from=build /out/pkg.tgz /home/app/api/static/pkg.tgz
RUN chown -v -R app:app /home/app

USER app
WORKDIR /home/app
RUN mkdir -p /home/app/connector
WORKDIR /home/app/connector


ENTRYPOINT ["api"]
CMD []
