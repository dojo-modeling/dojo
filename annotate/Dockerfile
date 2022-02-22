FROM jataware/mixmasta:0.6.5

RUN pip3 install --upgrade pip
COPY ./requirements.txt /annotate/requirements.txt
RUN pip3 install -r /annotate/requirements.txt

COPY . /annotate
WORKDIR /annotate

EXPOSE 8000
ENTRYPOINT []
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "300", "annotate.wsgi"]
