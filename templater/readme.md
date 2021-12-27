# Templater

`v0.1.0`

A simple editor for capturing metadata about model parameters.

## Setup dev environment, no docker (option #1, deprecated)

### Install python dependencies
This project assumes you already have [virtualenv, virtualenvwrapper](http://docs.python-guide.org/en/latest/dev/virtualenvs/) and [autoenv](https://github.com/kennethreitz/autoenv) installed globally on your system.

First, create a new virtual environment using python3:

    mkvirtualenv -p python3 templater

Then, install the required python dependencies

    pip install -r requirements.txt


### Run your local server
Ensure that the local `.env` file has been applied, then run

    flask run

or alternatively, use gunicorn

    gunicorn app:app --reload --bind 127.0.0.1:5000

---------------------------

## Setup dev environment, with docker compose (option #2)
Alternatively, you can run templater locally using docker compose

    docker-compose up -d

Note that docker will automatically build the containers for you the first time it runs. If you make changes to any of those containers, you'll need to manually specify that docker should rebuild them, using the `--build` flag, like so

    docker-compose up --build -d

Note: you don't need to reload the docker environment on every code change, only when you make larger changes to the environment the code is running in. The docker container for the web app is mounted to the local project directory on disk, meaning that any code changes you save to your disk automatically show up in the container. Additionally, the `ENTRYPOINT` in the web app's `Dockerfile` specifies that gunicorn should reload the server whenever it detects changes.

You can tail/follow the streaming logs from the app using

    docker logs -f templater-app

---------------------------

## Run the dojo API locally (required)
Since templater uses [the dojo API](https://github.com/dojo-modeling/dojo/tree/main/api) for all distance persistence, you'll want to have that running locally as well, side-by-side with templater.

The full readme for that project can be found here:

    https://github.com/dojo-modeling/dojo/tree/main/api#dojo-api

You can setup the dojo API locally for development, using this command

    docker-compose -f docker-compose-dev.yaml up --build -d

Once dojo is up and running, you'll need to specify the full dojo web app host as an environment variable, so that templater knows where to save and load.

If you setup your templater web app locally (no docker), you can simply export an environment variable in the same shell where you're running your local web server:

    export DOJO_HOST=http://localhost:8000

If you setup your templater web app using docker compose, you'll need to first [find the IP address that dojo is running on, using these instructions](https://github.com/dojo-modeling/dojo/tree/main/api#run-the-webapp), and then update the line that specifies the `DOJO_HOST` inside docker-compose.yml

    app:
      ...
      environment:
        ...
        DOJO_HOST: http://{your local IP address here}:8000

Note that you'll have to restart the templater docker container in order for this new environment to take effect.

---------------------------

### Testing and using
Once you've setup the web app (either option #1 or option #2) and have dojo running along side it, you can view the templater web app in your browser.

    http://localhost:5000/iframe/demo/

This page acts as a simple wrapper around the templater editor, which is loaded inside an iframe with a red border.

There is a simple editor for providing the `path` and `editor_contents` and passing those down into templater with the click of the blue button. Note that the `path` should have the following values

    - when editing a config, it should be the path to the config file
    - when editing a directive, it should be the path where that command is run

The gray button passes a save event into templater, causing it to save the user's parameters to dojo. Templater will then fire back an event indicating whether the event saved successfully or not, which is shown just above the iframe on the left.

### Templater PostMessage Interface

The templater editor emits the following events, formatted like `{"type": "<event_name>"}`:

 - `editor_loaded` - indicates the templater app is setup and ready to receive content
 - `params_saved` - indicates the params were successfully saved, outer/parent can close editor
 - `params_not_saved` - indicates the params were NOT saved, outer/parent should bring editor back into focus to present error UI to user

The templater editor listens for the following events, formatted like `{"type": "<event_name>"}`:

 - `save_clicked` - Indicates the user has clicked a save button in the outer/parent UI and now templater needs to persist the changes they've made. At this point, outer/parent should present a "loading" UI and listen for `params_saved` or `params_not_saved` to decided what to do next.
 - `file_opened` - Indicates the user has opened a file in the outer/parent UI. This event also requires a `file_content` key that contains the entire contents of the file the use has opened and a `file_path` key that contains the path to the file they've opened, relative to the base of the model (used to dedupe params across config files).


### Bumping Version

This project uses [`bump2version`](https://github.com/c4urself/bump2version) to manage the version. You can bump the version by running:

```
bump2version patch
```

or an equivalent. You may need to specify `--allow-dirty`.
