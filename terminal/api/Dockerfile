FROM golang:1.16.3-alpine3.13 AS build
RUN apk --no-cache add gcc g++ make git
WORKDIR /src
COPY ./server .

ARG TERMINAL_VERSION
ARG TERMINAL_BUILD
ARG TERMINAL_COMMIT

RUN GOOS=linux GOARCH=amd64 go build \
        -ldflags="-s -w" \
        -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
        -o /out/api main.go

FROM alpine:3.14
RUN apk --no-cache add ca-certificates
WORKDIR /usr/bin

COPY --from=build /out/api .

ENV USER=app
ENV GROUP=app
RUN addgroup -S ${USER} && adduser -S ${USER} -G ${GROUP}
USER app

WORKDIR /home/app
RUN mkdir -p /home/app/connector
WORKDIR /home/app/connector


ENTRYPOINT ["api"]
CMD []
