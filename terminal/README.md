

![Dojo Terminal](docs/clouseau.png)

![Build](https://github.com/jataware/clouseau/workflows/Build/badge.svg)

v1.0.0


## Demo

https://user-images.githubusercontent.com/969727/115638877-3bd3a700-a2e1-11eb-8f08-d3c9fa5907f0.mp4

```
go  v1.17
```


## Setup
```
make docker_build
```

`TERMINAL_WORKERS` - is a comma seperated list of "docker engines" for dev this will be your local ip

Add `DOCKERHUB_AUTH` Token and `REDIS_HOST` and `TERMINAL_WORKERS` to `.dockerenv` and `connector/server/.env`

Generate base64 auth token
```
echo '{"username":"<username>","password":"<password>","email":"<email>"}' | base64
```

```
DOCKERHUB_AUTH=<auth token>
REDIS_HOST=192.168.1.6
TERMINAL_WORKERS=192.168.1.6,192.168.1.7
```


## Run
```
# start a redis
docker run --rm --name redis1 --hostname redis1 -p 6378:6379 -d redis

make socat-start
make docker-compose_up
```

### lint
```
make go_fmt
```

### Build
```
make go_build
```


## Run Dev

Start docker proxy
```
make socat-start
```

Start server
```
make api_run_dev
```

### Bump Version

Install [bump2version](https://github.com/c4urself/bump2version)

```
bump2version --current-version <current-version> --new-version <new-version>  major|minor  --allow-dirty
```

Review changes and commit
