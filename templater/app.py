import os

from flask import Flask, render_template
from flask_session import Session

from views import web as web_blueprint

app = Flask(__name__)
app.secret_key = '3n13m3@n13myn13m0-templater'

# secure the session cookies
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = "Lax"

app.register_blueprint(web_blueprint)

# add a timestamp-based cache buster to static files
static_last_update = 0
for directory in os.walk("static/"):
    file_names = directory[2]
    for file_name in file_names:
        if file_name.startswith("."):
            continue  # ignore config files
        ext = file_name.split(".")[-1]
        if ext not in ["css", "js"]:
            continue  # skip fonts and images
        file_path = os.path.join(directory[0], file_name)
        updated_at = os.path.getmtime(file_path)
        if updated_at > static_last_update:
            static_last_update = updated_at
app.config['static_last_update'] = str(int(static_last_update))[-6:]


@app.template_filter('snake_to_title')
def snake_to_title(s):
    return " ".join([word.title() for word in s.split("_")])

@app.template_filter('env')
def env(default_value, key):
    # usage in template: {{ 'default_value' | env('KEY_NAME') }}
    return os.getenv(key, default_value)

@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template("500.html"), 500

@app.after_request
def apply_security_headers(response):

    # don't allow the site to load in an iframe (prevents click jacking)
    # response.headers["X-Frame-Options"] = "SAMEORIGIN"

    # don't allow browsers to auto-detect mime type
    # they should trust the `Content-Type` header with each response
    response.headers["X-Content-Type-Options"] = "nosniff"

    # prevents the browser from rendering the page if it detects a reflected JS/XSS attack
    # this is default behavior in most modern browsers, but good to be explicit for older browsers
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # instructs the browser to make all requests to this site over SSL (aka HSTS)
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"  # one year

    return response


if __name__ == '__main__':
    app.run(debug=True)
