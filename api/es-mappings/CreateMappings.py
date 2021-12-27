from elasticsearch import Elasticsearch
import json

es = Elasticsearch()
mapping = json.loads(open("runs.json").read())
es.indices.create("runs", body=mapping)
