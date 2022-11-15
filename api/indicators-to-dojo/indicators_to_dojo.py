#!/usr/bin/env python
# coding: utf-8

import os
import tarfile
import glob
import pandas as pd
import boto3
import json
from requests import get, post


s3_accessKey = os.getenv("AWS_ACCESS_KEY")
s3_secretKey = os.getenv("AWS_SECRET_KEY")
bucket_name = "jataware-world-modelers"

# Specifics for S3 zipped json file
s3_key = "indicators/jsons/s3_jsons.tar.gz"
filename = "s3_jsons.gz"
url = "http://localhost:8000/indicators/"
header = {"content-type": "application/json"}


### FUNCTIONS ###
def download_S3(s3_accessKey, s3_secretKey, bucket_name, s3_key, filename):
    print(f"Downloading {filename}")
    session = boto3.Session(
        aws_access_key_id=s3_accessKey, aws_secret_access_key=s3_secretKey
    )
    s3 = session.resource("s3")
    bucket = s3.Bucket(bucket_name)
    bucket.download_file(s3_key, filename)


def unzip_and_delete(filename):
    print(f"Decompressing {filename}")
    tar = tarfile.open(filename)
    tar.extractall()
    tar.close()
    print("Decompression Complete")
    os.remove(filename)
    print(f"Removed zip file {filename}")


def post_to_dojo(url, header, filename):
    print(f'Posting indicator {filename.split("/")[1].split(".")[0]} to Dojo')
    with open(filename) as f:
        data = json.load(f)
    response = post(url, data=json.dumps(data), headers=header)


if __name__ == "__main__":

    try:
        download_S3(s3_accessKey, s3_secretKey, bucket_name, s3_key, filename)
        unzip_and_delete(filename)

    except Exception as e:
        print("Problem with downloading or decompressin zipped json file")
        print(str(e))

    try:
        # TESTING MODE: slice into just a few indicators
        files = []
        for file in sorted(glob.glob("s3_jsons/*.json")):
            files.append(file)

        for file in files:
            post_to_dojo(url, header, file)

        """
        #PROD MODE: to post all indicators available in the zip file:
        for file in sorted(glob.glob("s3_jsons/*.json")):
            post_to_dojo(url, header, file)
            os.remove(file)
        os.rmdir("s3_jsons")    
        """

    except Exception as e:
        print("Problem with posting json file")
        print(str(e))
