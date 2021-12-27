FROM python:3.9.2

RUN pip3 install --upgrade pip

COPY . /templater
WORKDIR /templater

RUN pip3 install -r requirements.txt

EXPOSE 5000

ENTRYPOINT ["gunicorn", "app:app", "--reload", "--bind", "0.0.0.0:80"]
