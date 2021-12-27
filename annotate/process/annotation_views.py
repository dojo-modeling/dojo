# annotation views for column annotation
from django.shortcuts import render, redirect
import os
import pandas as pd
from .forms import (
    base_annotation,
    geo_form,
    coord_form,
    time_form,
    feature_form,
    date_validation,
    add_tag,
    associate_dates,
    date_association_checkbox,
    cord_pair_form,
    gridify,
    cord_association_checkbox,
    qualify_columns,
    qualify_checkbox,
    geo_select_form,
    alias_form
)
from conversions.conversions import gen_samples
import json
import logging

from utils.cache_helper import cache_get, cache_set

def generate_associated_dt_annotation(
    associations, orig_col, primary_time=False, description="", qualifies=None
):
    cols = [associations[x] for x in associations.keys() if x.find("_format") == -1]
    entry = {}
    for col in cols:
        for x in associations.keys():
            if associations[x] == col:
                t_type = x.replace("associated_", "")
        t_format = associations[f"associated_{t_type}_format"]

        entry[col] = {
            "Name": col,
            "Description": "",
            "Type": "Date",
            "Time": t_type,
            "primary_time": primary_time,
            "dateAssociation": True,
            "format": t_format,
            "associated_columns": {},
        }
        for x in associations.keys():
            if x.find("_format") == -1:
                if col == associations[x]:
                    continue
                entry[col]["associated_columns"][
                    x.replace("associated_", "")
                ] = associations[x]
        if col != orig_col:
            if qualifies != None:
                entry[col]["qualifies"] = qualifies

            entry[col]["redir_col"] = orig_col
            entry[col]["Description"] = description
    return entry


def generate_associated_coord_annotation(
    col, geo_type, associated_column, pg=False, description=""
):
    return {
        col: {
            "Name": col,
            "Description": description,
            "Type": "Geo",
            "Geo": geo_type,
            "primary_geo": pg,
            "isGeoPair": True,
            "Coord_Pair_Form": associated_column,
            "redir_col": associated_column,
        }
    }


def apply_annotations(el, col, uuid, annotations=None):
    """
    Occurs when clicking Edit or Annotate on the Instructions page.
    """
    if type(el) != str:
        return el
    if annotations == None:
        if "annotations.json" in os.listdir(f"data/{uuid}"):
            annotations = json.load(open(f"data/{uuid}/annotations.json", "r"))
        else:
            annotations = {}
            json.dump(annotations, open(f"data/{uuid}/annotations.json", "w"))
            return el

    if col not in annotations.keys():
        return el

    annotations = annotations[col]

    for idx in annotations.keys():
        if el.find(f'id="{idx}"') != -1:
            if idx == "qualifyColumn":
                el = el.replace(f'id="qualify"', f'id="qualify" checked')
                for x in annotations[idx]:
                    el = el.replace(
                        f'option value="{x}"', 'option value="{x}" selected'
                    )
            # we have found the element we need to populate
            elif annotations[idx] == True:
                # if it is true it is a checkbox
                el = el.replace(f'id="{idx}"', f'id="{idx}" checked')
            else:
                if annotations[idx] == "":
                    # if the annotations is blank skip this idx
                    continue
                if idx == "Description":
                    # this branch can populate text-area objects
                    el = el.replace("></textarea", f">{annotations[idx]}</textarea")
                if (
                    idx in ["Type", "Time", "Geo", "Coord_Pair_Form", "Data_Type", "Geo_Select_Form"]
                    or idx.find("associated") != -1
                ):
                    # this branch can populate bootstrap-select drop down
                    el = el.replace(
                        f'value="{annotations[idx]}"',
                        f'value="{annotations[idx]}" selected',
                    )
                else:
                    # this branch can populate input[type='text'] elements
                    el = el.replace(
                        f'id="{idx}"', f'id="{idx}" value="{annotations[idx]}"'
                    )
    return el


def clear_annotations(request, uuid, col):
    if "annotations.json" in os.listdir(f"data/{uuid}"):
        annotations = json.load(open(f"data/{uuid}/annotations.json", "r"))
    else:
        annotations = {}

    if col in annotations.keys():
        if "primary_geo" in annotations[col].keys():
            if annotations[col]["primary_geo"]:
                cache_set(uuid, "primary_country_set", False)
                cache_set(uuid, "primary_admin1_set", False)
                cache_set(uuid, "primary_admin2_set", False)
                cache_set(uuid, "primary_admin3_set", False)
                cache_set(uuid, "primary_coord_set", False)

        if "primary_time" in annotations[col].keys():
            if annotations[col]["primary_time"]:
                cache_set(uuid, "primary_time_set", False)

        if "dateAssociation" in annotations[col].keys():
            for x in annotations[col]["associated_columns"].values():
                if x != col:
                    del annotations[x]

        if "Coord_Pair_Form" in annotations[col].keys():
            del annotations[annotations[col]["Coord_Pair_Form"]]

        del annotations[col]
        json.dump(annotations, open(f"data/{uuid}/annotations.json", "w"))

    (
        primary_time_set,
        primary_country_set,
        primary_admin1_set,
        primary_admin2_set,
        primary_admin3_set,
        primary_coord_set,
    ) = one_primary(request, annotations)
    cache_set(uuid, "primary_time_set", primary_time_set)
    cache_set(uuid, "primary_country_set", primary_country_set)
    cache_set(uuid, "primary_admin1_set", primary_admin1_set)
    cache_set(uuid, "primary_admin2_set", primary_admin2_set)
    cache_set(uuid, "primary_admin3_set", primary_admin3_set)
    cache_set(uuid, "primary_coord_set", primary_coord_set)

    return redirect(f"../{uuid}")


def one_primary(request, annotations):
    primary_time_exists = False
    primary_country_exists = False
    primary_admin1_exists = False
    primary_admin2_exists = False
    primary_admin3_exists = False
    primary_coord_exists = False

    for x in annotations.keys():
        if "primary_time" in annotations[x]:
            primary_time_exists = True

        if "primary_geo" in annotations[x] and "Geo" in annotations[x]:
            if annotations[x]["Geo"] in ["Country", "ISO2", "ISO3"]:
                primary_country_exists = True
            elif annotations[x]["Geo"] == "State/Territory":
                primary_admin1_exists = True
            elif annotations[x]["Geo"] == "County/District":
                primary_admin2_exists = True
            elif annotations[x]["Geo"] == "Municipality/Town":
                primary_admin3_exists = True
            elif annotations[x]["Geo"] in ["Latitude", "Longitude", "Coordinates"]:
                primary_coord_exists = True
                
    return (
        primary_time_exists,
        primary_country_exists,
        primary_admin1_exists,
        primary_admin2_exists,
        primary_admin3_exists,
        primary_coord_exists,
    )


def post_annotations(request, uuid, col):
    email = cache_get(uuid, "email", None)

    if "Clear" in request.POST.keys():
        logging.info(f"{cache_get(uuid, 'logging_preface', None)} - Cleared annotations for col: {col}")
        return clear_annotations(request, uuid, col)

    if "annotations.json" in os.listdir(f"data/{uuid}"):
        annotations = json.load(open(f"data/{uuid}/annotations.json", "r"))
    else:
        annotations = {}

    if "primary_geo" in request.POST.keys() and "Geo" in request.POST.keys():
        geo_type = request.POST["Geo"]
        if geo_type in ["Latitude", "Longitude", "Coordinates"]:
            to_del = []
            for x in annotations.keys():
                if "primary_geo" in annotations[x].keys():
                    to_del.append(x)
            for x in to_del:
                del annotations[x]["primary_geo"]
    to_del = []

    if col in annotations.keys():
        to_del = [col]
        if "associated_columns" in annotations[col].keys():
            for x in annotations[col]["associated_columns"].values():
                if x in annotations.keys():
                    to_del.append(x)

    for x in to_del:
        del annotations[x]

    to_write = {}

    (
        primary_time_set,
        primary_country_set,
        primary_admin1_set,
        primary_admin2_set,
        primary_admin3_set,
        primary_coord_set,
    ) = one_primary(request, annotations)
    cache_set(uuid, "primary_time_set", primary_time_set)
    cache_set(uuid, "primary_country_set", primary_country_set)
    cache_set(uuid, "primary_admin1_set", primary_admin1_set)
    cache_set(uuid, "primary_admin2_set", primary_admin2_set)
    cache_set(uuid, "primary_admin3_set", primary_admin3_set)
    cache_set(uuid, "primary_coord_set", primary_coord_set)

    # Delete any other primary_time annotations; this happens when the user
    # ignores the warning.
    if "primary_time" in request.POST.keys():
        #if request.session["primary_time_set"]:
        if cache_get(uuid, "primary_time", False):
            for x in annotations.keys():
                if "primary_time" in annotations[x].keys():
                    del annotations[x]["primary_time"]
        cache_set(uuid, "primary_time_set", True)


    # Delete any other primary_geo - Geo combinations; this happens when the user
    # ignores the warning.
    if "primary_geo" in request.POST.keys() and "Geo" in request.POST.keys():
        session_key = None
        geo_type = request.POST["Geo"]
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
            #if request.session[session_key]:
            if cache_get(uuid, session_key, False):
                for x in annotations.keys():
                    if (
                        "primary_geo" in annotations[x].keys()
                        and annotations[x]["Geo"] == geo_type
                    ):
                        # Replacing Country with Country, Admin1 with Admin1 etc. i.e. same format.
                        del annotations[x]["primary_geo"]
                    elif (
                        "primary_geo" in annotations[x].keys()
                        and annotations[x]["Geo"] in ["Country", "ISO2", "ISO3"]
                        and session_key == "primary_country_set"
                    ):
                        # Group Country,ISO2,ISO3 together
                        del annotations[x]["primary_geo"]
                        cache_set(uuid, "primary_coord_set", False)
                    elif (
                        "primary_geo" in annotations[x].keys()
                        and annotations[x]["Geo"]
                        in ["Latitude", "Longitude", "Coordinates"]
                        and session_key == "primary_coord_set"
                    ):
                        # TODO: handling lat/long and coords. Should be very rare.
                        # TODO: Be sure to allow lat and long to coexist as a pair.
                        cache_set(uuid, "primary_country_set", False)
            else:
                # primary_country_set and primary_coord_set are mutally exclusive. So if one is set,
                # remove all refereces to the other.
                for x in annotations.keys():
                    if (
                        "primary_geo" in annotations[x].keys()
                        and annotations[x]["Geo"] in ["Country", "ISO2", "ISO3"]
                        and session_key != "primary_country_set"
                        and primary_country_set != True
                    ):
                        del annotations[x]["primary_geo"]
                        cache_set(uuid, "primary_country_set", False)
                    elif (
                        "primary_geo" in annotations[x].keys()
                        and annotations[x]["Geo"]
                        in ["Latitude", "Longitude", "Coordinates"]
                        and session_key != "primary_coord_set"
                    ):
                        del annotations[x]["primary_geo"]
                        cache_set(uuid, "primary_coord_set", False)
            cache_set(uuid, session_key, True)

    body = request.POST
    associations = {}
    if "dateAssociation" in body.keys():
        if body["dateAssociation"] == "true":
            for x in body.keys():
                if x.find("associated_") != -1:
                    associations[x] = body[x]
        if "primary_time" in body.keys():
            pt = True
        else:
            pt = False

        associations[request.POST["Time"]] = col
        to_del = []
        for x in associations.keys():
            if associations[x] == "No Associable Column":
                to_del.append(x)

        for x in to_del:
            del associations[x]
        qualifies = None

        if "qualifyColumn" in request.POST.keys():
            qualifies = request.POST.getlist("qualifyColumn")

        generated_annotations = generate_associated_dt_annotation(
            associations,
            col,
            pt,
            description=request.POST["Description"],
            qualifies=qualifies,
        )
        for x in generated_annotations.keys():
            annotations[x] = generated_annotations[x]
            for y in annotations[x]["associated_columns"]:
                if x == annotations[x]["associated_columns"][y]:
                    del annotations[x]["associated_columns"][y]

    if "isGeoPair" in body.keys():
        other_col = body["Coord_Pair_Form"]
        if body["Geo"] == "Latitude":
            geo_type = "Longitude"
        elif body["Geo"] == "Longitude":
            geo_type = "Latitude"
        if "primary_geo" in body.keys():
            pg = True
        else:
            pg = False

        other_anno = generate_associated_coord_annotation(
            other_col, geo_type, col, pg, description=request.POST["Description"]
        )

        for x in other_anno.keys():
            annotations[x] = other_anno[x]

    for x in body:
        if x.find("csrfmiddle") == -1:
            if request.POST[x] == "true":
                to_write[x] = True
            else:
                if x == "qualifyColumn":
                    to_write[x] = request.POST.getlist(x)
                else:
                    to_write[x] = request.POST[x]

    for x in body:
        if x.find("associated_") != -1:
            del to_write[x]

    pruned_associations = {
        x.replace("associated_", ""): associations[x]
        for x in associations.keys()
        if x.find("_format") == -1
    }

    if pruned_associations != {}:
        to_write["associated_columns"] = pruned_associations
        t_type = request.POST["Time"]
        to_write["format"] = associations[f"associated_{t_type}_format"]

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
    alias_indices = [int(x.split('-')[-1]) for x in body if 'alias-current' in x]
    aliases = {}
    for i in alias_indices:
        aliases[body[f"alias-current-{i}"]] = body[f"alias-new-{i}"]
        del to_write[f"alias-current-{i}"]
        del to_write[f"alias-new-{i}"]
    to_write['aliases'] = aliases

    annotations[col] = to_write

    json.dump(annotations, open(f"data/{uuid}/annotations.json", "w"))
    return redirect(f"../{uuid}")

def annotate_column(request, uuid, context={}):
    email = cache_get(uuid, "email", None)

    col = request.GET.get("col", "")

    logging_preface = cache_get(uuid, 'logging_preface', None)

    if request.POST:
        logging.info(f"{logging_preface} - Submitted annotation for column: {col}")
        return post_annotations(request, uuid, col)

    logging.info(f"{logging_preface} - Viewing column: {col}")
    gc = json.load(open(f"data/{uuid}/geotime_classification.json", "r"))

    (
        base_annotation_def_val,
        time_form_def_val,
        date_validation_def_val,
        geo_form_def_val,
        datetime_piece,
    ) = (None, None, None, None, None)

    strftime_conversion = {
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

    annotations = {}
    if "annotations.json" in os.listdir(f"data/{uuid}"):
        annotations = json.load(open(f"data/{uuid}/annotations.json", "r"))

    if col in annotations.keys():
        if "redir_col" in annotations[col].keys():
            if annotations[col]["redir_col"] in annotations.keys():
                return redirect(
                    f'../annotate/{uuid}?col={annotations[col]["redir_col"]}',
                    request,
                )

    if col not in annotations.keys():
        if col in gc.keys():
            entry = gc[col]
            if entry["category"] == "geo":
                geo_form_def_val = entry["subcategory"]
                base_annotation_def_val = "Geo"
                time_form_def_val = None
                date_validation_def_val = None
            elif entry["category"] == "time":
                base_annotation_def_val = "Date"
                time_form_def_val = entry["subcategory"]
                date_validation_def_val = entry["format"]
                if date_validation_def_val.count("%") == 1:
                    for x in strftime_conversion.keys():
                        if date_validation_def_val.find(x) != -1:
                            time_form_def_val = strftime_conversion[x]
                geo_form_def_val = None
            else:
                base_annotation_def_val = "Feature"

    possible_time_associations = {}

    for k in gc.keys():
        entry = gc[k]
        if entry["category"] == "time":
            date_format = entry["format"]
            if date_format.count("%") == 1:
                for x in strftime_conversion.keys():
                    if date_format.find(x) != -1:
                        possible_time_associations[k] = date_format
        elif entry["category"] == "geo":
            # possible_geo_associations.append(k)
            pass
    if base_annotation_def_val == None:
        if col in annotations.keys():
            if "Type" not in annotations[col].keys():
                base_annotation_def_val = "Feature"

    a = {
        "base_annotation_def_val": base_annotation_def_val,
        "time_form_def_val": time_form_def_val,
        "date_validation_def_val": date_validation_def_val,
        "geo_form_def_val": geo_form_def_val,
    }

    if col in annotations.keys():
        if "associated_columns" in annotations[col].keys():
            del possible_time_associations
            possible_time_associations = {}
            for x in annotations[col]["associated_columns"].keys():
                col_to_add = annotations[col]["associated_columns"][x]
                possible_time_associations[col_to_add] = annotations[col_to_add][
                    "format"
                ]
    df = None

    #if not request.session.get("new_samples", False):
    if not cache_get(uuid, "new_samples", False):
        df = pd.read_csv(f"data/{uuid}/raw_data.csv", nrows=10000)
        gen_samples(uuid, df)
        cache_set(uuid, "new_samples", True)

    samples = cache_get(uuid, "annotation_samples")

    if not samples or cache_get(uuid, "sample_uuid") != uuid:
        df = pd.read_csv(f"data/{uuid}/raw_data.csv", nrows=100)
        logging.info("Annotation samples unavailable, reading in dataset.")
        cache_set(uuid, "sample_uuid", uuid)
    else:
        df = pd.DataFrame(samples)
        #if "samples_log" not in request.session:
        if cache_get(uuid, 'samples_log', None) == None:
            cache_set(uuid, "samples_log", True)

    context["df"] = (
        pd.DataFrame(df.dropna(subset=[col])[:5])
        .to_html(escape=False, index=False)
        .replace("<table", '<table class="tableBoot" id="annotation_table"')
    )
    context["base_form"] = base_annotation(
        col, "base", def_type=base_annotation_def_val, def_name=col
    )

    # Track which geo are primary_geo = True.
    primary_geo_fields = [
        k
        for k, v in annotations.items()
        if v["Type"] == "Geo" and "primary_geo" in v and v["primary_geo"] == True
    ]

    # Create geo html for annotation.
    context["base_geo_form"] = geo_form(
        col,
        "baseGeo",
        def_val=geo_form_def_val,
        primary_geo_fields=primary_geo_fields,
        primary_country_set=cache_get(uuid, "primary_country_set", False),
        primary_admin1_set=cache_get(uuid,"primary_admin1_set", False),
        primary_admin2_set=cache_get(uuid,"primary_admin2_set", False),
        primary_admin3_set=cache_get(uuid,"primary_admin3_set", False),
        primary_coord_set=cache_get(uuid,"primary_coord_set", False),
    )

    context["coordinate_pair"] = coord_form(col, "cordPair")
    context["base_time_form"] = time_form(
        col,
        "baseTime",
        def_val=time_form_def_val,
        primary_time_set=cache_get(uuid,"primary_time_set", False),
    )
    context["base_feature_form"] = feature_form(col, "baseFeature")
    context["cord_pair_form"] = cord_pair_form(df.drop(col, axis=1).columns)
    context["associated_cordinate"] = coord_form(df.drop(col, axis=1).columns)
    context["cord_association_checkbox"] = cord_association_checkbox()
    context["geo_select_form"] = geo_select_form()
    context["num_columns"] = len(df.columns)

    # TODO ADD GEOTIME CLASSIFY STRFTIME
    context["date_validation"] = date_validation(
        date_validation_def_val, "dateValidation"
        )
    context["date_association_form"] = associate_dates(
        df.columns, possible_time_associations
    )
    context["date_association_checkbox"] = date_association_checkbox()
    context["qualify_checkbox"] = qualify_checkbox()

    context["col"] = col
    context["uuid"] = uuid
    context["qualify_columns"] = qualify_columns(df.drop(col, axis=1).columns)

    for x in context.keys():
        pre = context[x]
        # if x != geo_association_checkbox:
        context[x] = apply_annotations(context[x], col, uuid)

    context["columns"] = {value: count for count, value in enumerate(df.columns)}
    counter = 1
    for x in df.columns:
        if x == col:
            context["curr_col_no"] = counter
            break
        else:
            counter += 1

    context["aliases"] = alias_form(annotations.get(col, {}).get("aliases", None))

    return render(request, "process/annotation.html", context)