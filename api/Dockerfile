FROM --platform=linux/amd64 python:3.9.2


RUN pip install --upgrade pip

COPY . /api
WORKDIR /api

RUN pip install -r requirements.txt

EXPOSE 80
CMD ["uvicorn", "server:api", "--host", "0.0.0.0", "--port", "80", "--log-config", "logging.yaml"]
