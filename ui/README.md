
v1.0.0

## Demo
tbd

```
node v15.14.0
npm v7.7.6
```

## Setup
```
make docker_build
```

### lint
```
make npm_lint
```

### Build
```
make npm_build
```

## Run Dev

Start UI
```
(cd ui && npm i)
make npm_run_dev
```

open [http://localhost:8080](http://localhost:8080)


### Bump Version

Install [bump2version](https://github.com/c4urself/bump2version)

```
bump2version --current-version <current-version> --new-version <new-version>  major|minor  --allow-dirty
```

Review changes and commit

