FROM --platform=linux/amd64 python:3.8

RUN apt-get update &&\
    apt-get install -y gdal-bin libgdal-dev wget unzip python3-rtree python3-all-dev

RUN wget https://jataware-world-modelers.s3.amazonaws.com/gadm/gadm36_2.feather.zip
RUN wget https://jataware-world-modelers.s3.amazonaws.com/gadm/gadm36_3.feather.zip
RUN mkdir ~/mixmasta_data && \
      unzip gadm36_2.feather.zip -d ~/mixmasta_data/ && \
      unzip gadm36_3.feather.zip -d ~/mixmasta_data/ && \
      rm gadm36_?.feather.zip

ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

RUN pip install --upgrade pip
RUN pip install numpy==1.22  # Numpy must be installed before GDAL (in requirements.txt) to prevent issues

COPY ./tasks/requirements.txt /tasks/requirements.txt
WORKDIR /tasks
RUN pip install -r requirements.txt
COPY ./tasks /tasks


ENV PYTHONPATH "${PYTHONPATH}:/api"
