# Dojo Modeling

<!-- <img src="docs/assets/Dojo_Logo_color.svg?raw=true" alt="Dojo logo" width=350 style="background-color: #DDDDDD; padding: 20px; padding-right: 35px; border-radius: 20px"/> -->
<img src="docs/assets/Dojo_Logo_profile.png?raw=true" alt="Dojo logo" width=350 />

<br>
<br>

 Dojo modeling is a repository for registering, storing, and running data-science models.

*  During model registration, metadata is collected about the model to identify and parameterize the relevent configuration files and command line arguments to allow multiple model runs via the Dojo API or the Dojo-CLI tool.
* Models are stored in specialized Docker containers. These containers can by pushed to DockerHub or a private Docker repo. The containers are portable and can be shared, downloaded, and run locally.

<br>

# Setup

1. Clone repo
2. Run `$ make init` to configure and pull the required submodules
3. Add your secrets to the file `envfile`  
 -- NOTE: You should rarely, if ever, need to change any of the host names or ports. You should really only need to set the variables that are wrapped in `${...}`
4. Run `$ make up` to build and bring online all services
5. Run `$ make create-es-indexes` to create the elasticsearch indexes
6. Setup is complete

# Running

To start all services: `$ make up`

To stop all services: `$ make down`

To force rebuild all images: `$ make rebuild all`

To view logs: `$ make logs` or `$ docker-compose logs {service-name}`


# Endpoints

* ui: http://localhost:8080/
* api: http://localhost:8000/
* annotate: http://localhost:8001/
* terminal: http://localhost:3000/
* templater: http://localhost:5000/
* elasticsearch: http://localhost:9200/
* redis: http://localhost:6379/


## Loading images to the internal Docker server

When `make up` command is run, the Ubuntu image is pulled and loaded in to the internal docker server. As some of the images are quite large, for the sake of time and bandwidth only the Ubuntu image is automatically loaded.

If you need a different base image loaded, you can load it with this command: `docker-compose exec docker docker pull jataware/dojo-publish:{base_image_tag_name}`

Since the Docker service has a persistent volume, you should not need to rerun the command unless changes have been made to the image.

