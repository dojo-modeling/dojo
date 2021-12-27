import io
import os
import hashlib

import boto3
from bs4 import BeautifulSoup

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    # aws_session_token=os.environ["SESSION_TOKEN"]
)

def convert_to_template(editor_html):

    editor = BeautifulSoup(editor_html, "html.parser")
    template_lines = []
    for line in editor.find_all("span", "editor-line"):
        line_tags = line.contents

        for param_tag in line.find_all("span", "saved-param"):
            param_tag.string.replace_with("{{ "+param_tag.string+" }}")

        for static_tag in line.find_all("span", "saved-param-static"):
            pass # no-op, leave tag's string contents as-is, already replaced w default value by UI

        template_lines.append("".join([t.string for t in line_tags]))

    template = "\n".join(template_lines)

    if os.environ.get("ENV") == "DEV":
        print("=== here's the template ===")
        print(template)
        print("=== end template ===")

    return template

def build_s3_key(model_id, path, file_type):
    if path.startswith("/"):
        path = path[1:]  # trim leading slash
    return f"dojo/templater_templates/{model_id}/{path}.{file_type}.txt"

def build_s3_url(s3_key):
    return "https://{bucket}.s3.amazonaws.com/{key}".format(
        bucket=os.environ["S3_BUCKET"],
        key=s3_key
    )

def upload_to_s3(file, s3_key):
    s3_client.upload_fileobj(
        io.BytesIO(file.encode('utf-8')),
        Bucket=os.environ["S3_BUCKET"],
        Key=s3_key,
        ExtraArgs={'ACL':'public-read'},
    )
