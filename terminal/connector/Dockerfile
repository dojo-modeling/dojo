FROM golang:stretch AS build
WORKDIR /src
ENV CGO_ENABLED=0
COPY ./embedded ./embedded
COPY ./preexec ./preexec

ARG TERMINAL_VERSION
ARG TERMINAL_BUILD
ARG TERMINAL_COMMIT

WORKDIR /src/embedded/
RUN GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" \
    -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
    -o /out/connector main.go

WORKDIR /src/preexec/
RUN GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" \
     -ldflags "-X main.Version=${TERMINAL_VERSION} -X main.Build=${TERMINAL_BUILD} -X main.Commit=${TERMINAL_COMMIT}" \
     -o /out/c main.go

FROM ubuntu:20.04

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && apt-get clean && apt-get install -y \
    sudo \
    wget \
    curl \
    git \
    zip \
    gpg-agent \
    openssh-server

RUN mkdir /var/run/sshd
RUN mkdir -p /var/log/connector && chmod 777 /var/log/connector
RUN echo 'root:root' |chpasswd
RUN ssh-keygen -A
RUN sed -ri 's/^#?PermitRootLogin\s+.*/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -ri 's/UsePAM yes/#UsePAM yes/g' /etc/ssh/sshd_config

RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN echo "clouseau ALL=NOPASSWD:ALL" >> /etc/sudoers.d/50-clouseau

RUN useradd --user-group --create-home clouseau && \
    usermod -s /bin/bash clouseau && \
    echo "clouseau:clouseau" | chpasswd clouseau && \
    echo 'Defaults    env_keep += "DEBIAN_FRONTEND"' >> /etc/sudoers.d/env_keep && \
    mkdir /home/clouseau/.ssh /home/clouseau/.tools && \
    mkdir -p /home/clouseau/.local/bin && \
    echo "\n\
if [ -n \$BASH ] && [ -r ~/.bashrc ]; then\n\
    . ~/.bashrc\n\
fi\n" >> /home/clouseau/.bash_profile

COPY --from=build /out/connector /home/clouseau/.tools/connector
COPY --from=build /out/c /home/clouseau/.tools/c
COPY sshd/assets/default-settings.yaml /home/clouseau/.tools/default-settings.yaml

COPY sshd/assets/10-bash-hooks.sh /etc/profile.d/10-bash-hooks.sh
COPY sshd/assets/.bash-preexec /home/clouseau/.bash-preexec
COPY sshd/assets/.bashrc /home/clouseau/.bashrc
COPY sshd/assets/.hooks /home/clouseau/.hooks


RUN chown -v -R clouseau:clouseau /home/clouseau

USER clouseau
WORKDIR /home/clouseau

COPY sshd/entrypoint.sh /usr/local/bin/entrypoint.sh

ENTRYPOINT []
CMD ["entrypoint.sh"]
