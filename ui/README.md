

v0.1.0

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

### Testing

There is currently only one test: an end to end test of the entire model creation flow (up to the 'Publish' step) in Cypress.
You can open the test runner app with:
```
make cypress_open
```
Notes:
- Currently any existing model containers need to be manually deleted between runs of the test. You can do this in `/admin` (which does not reliably delete containers) or directly in Docker. If you try run the test, get to the container creation progress bar, and see a "something went horribly wrong" error, it is likely because there is an existing model container.
- Make sure to select Chrome as your test browser in the Cypress app. In order to get Cypress working with our iframes, we need the `chromeWebSecurity: false` flag found in `ui/cypress.json`. At this point Cypress only supports this in Chrome.
