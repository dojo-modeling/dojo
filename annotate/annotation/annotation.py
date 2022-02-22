import pandas as pd
from django.shortcuts import render, redirect
import os
import pandas as pd
from .associations import (
    generate_associated_dt_annotation,
    generate_associated_coord_annotation,
)
import json
import logging
from .form_population import Form
from utils.cache_helper import cache_get, cache_set
from .helper_functions import gen_samples
from .one_primary_set import one_primary_set
from django.views import View


class Annotation(View):
    """View responsible for handling the annotations post and serving the form [get and post]"""

    def set_vars(self, uuid, col):
        self.uuid = uuid
        self.strftime_conversion = {
            "Y": "Year",
            "y": "Year",
            "m": "Month",
            "d": "Day",
            "j": "Day",
            "H": "Hour",
            "I": "Hour",
            "M": "Minute",
            "S": "Second",
        }
        self.col = col
        self.gc = self.get_gc()
        self.annotations = self.get_annotations()
        self.samples = self.get_samples()
        self.fp = f"data/{self.uuid}/annotations.json"
        self.context = {"uuid": self.uuid, "col": self.col}

    def date_association_post(self, post):
        """post handling if post has a dateAssociation"""
        col = self.col
        associations = {}
        if post.get("dateAssociation", False):
            for x in post:
                if x.find("associated_") != -1:
                    associations[x] = post[x]
            if "primary_time" in post:
                pt = True
            else:
                pt = False

            associations[post.get("Time")] = col
            to_del = []

            for x in associations:
                if associations[x] == "No Associable Column":
                    to_del.append(x)

            for x in to_del:
                del associations[x]

            qualifies = None

            if "qualifyColumn" in post:
                qualifies = post.getlist("qualifyColumn")

            generated_annotations = generate_associated_dt_annotation(
                associations,
                col,
                pt,
                description=post["Description"],
                qualifies=qualifies,
            )

            for x in generated_annotations.keys():
                self.annotations[x] = generated_annotations[x]
                for y in self.annotations[x]["associated_columns"]:
                    if x == self.annotations[x]["associated_columns"][y]:
                        del self.annotations[x]["associated_columns"][y]
        self.associations = associations
        return True

    def clear_annotations(self):
        annotations, col, uuid = self.annotations, self.col, self.uuid
        if annotations.get(col, {}).get("dateAssociation", False):
            # Clear associated column
            for x in annotations.get(col, {}).get("associated_columns", []):
                if x != col:
                    del annotations[x]

        if annotations.get(col, {}).get("Coord_Pair_Form", False):
            if annotations.get(annotations[col]["Coord_Pair_Form"], False):
                del annotations[annotations[col]["Coord_Pair_Form"]]

        logging.info(annotations)
        logging.info(col)
        if annotations.get(col):
            logging.info(f"deleteting {col}")
            del annotations[col]

        self.annotations = annotations
        self.save_annotations()

        return True

    def geo_pair_post(self, post):
        col = self.col
        if "isGeoPair" in post:
            other_col = post["Coord_Pair_Form"]
            if post["Geo"] == "Latitude":
                geo_type = "Longitude"
            elif post["Geo"] == "Longitude":
                geo_type = "Latitude"
            if "primary_geo" in post:
                pg = True
            else:
                pg = False

            other_anno = generate_associated_coord_annotation(
                other_col, geo_type, col, pg, description=post["Description"]
            )

            for x in other_anno.keys():
                self.annotations[x] = other_anno[x]

    def post(self, request, *args, **kwargs):
        """post handling for annotation"""
        self.set_vars(kwargs.get("uuid"), request.GET.get("col"))
        post = request.POST
        annotations, uuid, col = self.annotations, self.uuid, self.col

        if post.get("Clear", False):
            # handling for clear button
            self.clear_annotations()
            logging.info(
                f"{cache_get(uuid, 'logging_preface', None)} - Cleared annotations for col: {col}"
            )
            return redirect(f"../{uuid}", request)

        # TODO annotations var replace
        logging_preface = cache_get(uuid, "logging_preface", None)
        logging.info(f"{logging_preface} - posted column: {col}")

        if post.get("primary_geo", False) and post.get("Geo", False):
            # write over existing primary_geo if new one is posted
            geo_type = post.get("Geo")
            if geo_type in ["Latitude", "Longitude", "Coordinates"]:
                to_del = []
                for x in annotations:
                    if annotations.get(x, {}).get("primary_geo", False):
                        to_del.append(x)
                for x in to_del:
                    del annotations[x]["primary_geo"]

        to_del = []
        if annotations.get(col):
            # delete existing annotations for this col and associated ones if it is reposted
            to_del = [col]
            for x in annotations.get(col, {}).get("associated_columns", []):
                if annotations.get(x, False):
                    to_del.append(x)

        for x in to_del:
            del annotations[x]

        to_write = {}

        self.annotations = annotations

        # Delete any other primary_time annotations; this happens when the user
        # ignores the warning.
        if post.get("primary_time", False):
            if cache_get(uuid, "primary_time", False):
                for x in annotations:
                    if "primary_time" in annotations[x].keys():
                        del annotations[x]["primary_time"]
            cache_set(uuid, "primary_time_set", True)

        # Delete any other primary_geo - Geo combinations; this happens when the user
        # ignores the warning.
        if post.get("primary_geo", False) and post.get("Geo", False):
            session_key = None
            geo_type = post.get("Geo")
            if geo_type in ["Country", "ISO2", "ISO3"]:
                session_key = "primary_country_set"
            elif geo_type == "State/Territory":
                session_key = "primary_admin1_set"
            elif geo_type == "County/District":
                session_key = "primary_admin2_set"
            elif geo_type == "Municipality/Town":
                session_key = "primary_admin3_set"
            elif geo_type in ["Latitude", "Longitude", "Coordinates"]:
                session_key = "primary_coord_set"

            if session_key:
                # if request.session[session_key]:
                if cache_get(uuid, session_key, False):
                    for x in annotations:
                        if annotations.get(x).get("primary_geo", False):
                            del annotations[x]["primary_geo"]

        self.annotations = annotations

        self.date_association_post(post)
        self.geo_pair_post(post)

        annotations = self.annotations

        for x in post:
            if x.find("csrfmiddle") == -1:
                if post[x] == "true":
                    to_write[x] = True
                else:
                    if x == "qualifyColumn":
                        to_write[x] = post.getlist(x)
                    else:
                        to_write[x] = post[x]

        for x in post:
            if x.find("associated_") != -1:
                # don't write associated columns, that is handled in generate_associated_xyz
                del to_write[x]

        pruned_associations = {
            x.replace("associated_", ""): self.associations[x]
            for x in self.associations
            if x.find("_format") == -1
        }

        if pruned_associations != {}:
            to_write["associated_columns"] = pruned_associations
            t_type = post["Time"]
            to_write["format"] = self.associations[f"associated_{t_type}_format"]

        to_del = []

        if "associated_columns" in to_write:
            for x in to_write["associated_columns"]:
                if to_write["associated_columns"][x] == col:
                    to_del.append(x)
        for x in to_del:
            del to_write["associated_columns"][x]

        # Handle aliases by generating a dictionary of key/values for each
        # current and new alias pairing. Then remove those keys from the annotations object
        # and add in an `aliases` key for the built dictionary.
        alias_indices = [int(x.split("-")[-1]) for x in post if "alias-current" in x]
        aliases = {}
        for i in alias_indices:
            aliases[post[f"alias-current-{i}"]] = post[f"alias-new-{i}"]
            del to_write[f"alias-current-{i}"]
            del to_write[f"alias-new-{i}"]
        to_write["aliases"] = aliases

        annotations[col] = to_write
        self.annotations = annotations

        self.save_annotations()
        one_primary_set(annotations, {"uuid": self.uuid})

        return redirect(f"../{uuid}", request)

    def get_samples(self):
        """generate the samples for the ui if they are not present in the cache"""
        uuid = self.uuid
        if not cache_get(uuid, "new_samples", False):
            df = pd.read_csv(f"data/{uuid}/raw_data.csv", nrows=10000)
            gen_samples(uuid, df)
            cache_set(uuid, "new_samples", True)
        return cache_get(uuid, "annotation_samples")

    def get_gc(self):
        """get geotime classifications for this column"""
        with open(f"data/{self.uuid}/geotime_classification.json", "r") as infile:
            return json.load(infile)

    def save_annotations(self):
        """save annotations to file"""
        with open(self.fp, "w") as outfile:
            json.dump(self.annotations, outfile)
        return True

    def get_annotations(self):
        """get annotations from file"""
        if "annotations.json" in os.listdir(f"data/{self.uuid}"):
            with open(f"data/{self.uuid}/annotations.json", "r") as infile:
                annotations = json.load(infile)
        else:
            annotations = {}

        return annotations

    def get(self, request, *args, **kwargs):
        """logic responsible for building the necessary context and serving the form"""

        self.set_vars(kwargs.get("uuid"), request.GET.get("col"))

        context, annotations, uuid, col = (
            self.context,
            self.annotations,
            self.uuid,
            self.col,
        )

        email = cache_get(uuid, "email", None)

        logging_preface = cache_get(uuid, "logging_preface", None)
        logging.info(f"{logging_preface} - Viewing column: {col}")

        gc = self.gc

        redir_col = annotations.get(col, {}).get("redir_col", False)
        if redir_col:
            if annotations.get(redir_col, False):
                return redirect(
                    f'../annotate/{uuid}?col={annotations[col]["redir_col"]}',
                    request,
                )

        # if not request.session.get("new_samples", False):
        samples = self.samples
        df = pd.DataFrame(samples)

        form = Form(annotations, gc, df, col, uuid)

        for x in form.context:
            context[x] = form.context[x]

        return render(request, "annotation/annotation.html", context)
