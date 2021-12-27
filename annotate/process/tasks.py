import copy
import json
import logging
import os
import time

from django.apps import apps
from django.conf import settings
from django_rq import job

from mixmasta import mixmasta as mix
from utils.cache_helper import cache_get


# Load GADM3 from gadm app
if settings.CACHE_GADM:
    gadm3 = apps.get_app_config("gadm").gadm3()
    gadm2 = apps.get_app_config("gadm").gadm2()
else:
    gadm3 = None
    gadm2 = None


def build_mapper(uuid):
    """
    Description
    -----------
    Performs two functions:
    (1) Build and return the mixmasta mapper.json from annotations.json.
    (2) Return geo_select if "Geo_Select_Form" is annotated.

    Returns
    -------
        ret: dictionary
            geo, date, and feature keys for mixmasta process.
        geo_select: string, default None
            admin_level if set during annotation: country, admin1, admin2, admin3

    """

    # Set default return value (None) for geo_select.
    geo_select = None
    
    fp = f"data/{uuid}/annotations.json"
    annotations = json.load(open(fp, "r"))
    conversion_names = {
        "name": "display_name",
        "geo": "geo_type",
        "time": "date_type",
        "format": "time_format",
        "data_type": "feature_type",
        "unit_description": "units_description",
        "coord_pair_form": "is_geo_pair",
        "qualifycolumn": "qualifies",
        "string": "str",
    }
    ret = {"geo": [], "date": [], "feature": []}
    for orig_name in annotations.keys():
        entry = {}
        entry["name"] = orig_name
        for x in annotations[orig_name].keys():
            if x in ["redir_col"]:
                continue
            
            # Set geo_select if annotated.
            if str(x).lower() == "geo_select_form":
                geo_select = annotations[orig_name][x]
                # Mixmasta expects "admin0" not "country".
                if geo_select.lower() == 'country':
                    geo_select = 'admin0'
                logging.info(f'set Geo_Select to {geo_select}')

            if x.lower() in conversion_names.keys():
                new_col_name = conversion_names[x.lower()]
            else:
                new_col_name = x.lower()

            if new_col_name != "display_name":
                if new_col_name == "qualifies":
                    if type(annotations[orig_name][x]) == str:
                        annotations[orig_name][x] = [annotations[orig_name][x]]
                if type(annotations[orig_name][x]) == str and new_col_name not in [
                    "is_geo_pair",
                    "qualifies",
                    "dateformat",
                    "time_format",
                    "description",
                ]:
                    entry[new_col_name] = annotations[orig_name][x].lower()
                else:
                    entry[new_col_name] = annotations[orig_name][x]
            else:
                entry[new_col_name] = annotations[orig_name][x]

        for x in ["dateassociate", "isgeopair", "qualify"]:
            if x in entry.keys():
                del entry[x]

        ret[entry["type"]].append(entry)

    for x in range(len(ret["date"])):
        if "dateformat" in ret["date"][x].keys():
            ret["date"][x]["time_format"] = ret["date"][x]["dateformat"]
            del ret["date"][x]["dateformat"]

        if "primary_time" in ret["date"][x].keys():
            ret["date"][x]["primary_date"] = ret["date"][x]["primary_time"]
            del ret["date"][x]["primary_time"]

    json.dump(ret, open(f"data/{uuid}/mixmasta_ready_annotations.json", "w"))
    return ret, geo_select


def valid_qualifier_target(entry):
    k = entry.keys()
    for x in ["qualify", "primary_geo", "primary_time"]:
        if x in k:
            if entry[x] == True:
                return False
    return True


def is_qualifier(entry):
    for x in ["qualify", "qualifies", "qualifyColumn"]:
        if x in entry.keys():
            return True
    return False


def clear_invalid_qualifiers(uuid):
    fp = f"data/{uuid}/annotations.json"
    annotations = json.load(open(fp, "r"))
    to_del = {}
    for x in annotations.keys():
        if "qualify" in annotations[x].keys():
            if annotations[x]["qualify"] == True:
                to_del[x] = []
                if type(annotations[x]["qualifyColumn"]) == str:
                    annotations[x]["qualifyColumn"] = [annotations[x]["qualifyColumn"]]

                for y in annotations[x]["qualifyColumn"]:
                    if y in annotations.keys():
                        if not valid_qualifier_target(annotations[y]):
                            to_del[x].append(y)
                    else:
                        to_del[x].append(y)
    to_drop = []
    for x in to_del.keys():
        for y in to_del[x]:
            annotations[x]["qualifyColumn"].remove(y)
        if annotations[x]["qualifyColumn"] == []:
            to_drop.append(x)
    for x in to_drop:
        if x in annotations.keys():
            del annotations[x]

    json.dump(annotations, open(fp, "w"))


@job("default", timeout=-1)
def process_preview(uuid):
    email = cache_get(uuid, "email", None)
    clear_invalid_qualifiers(uuid)

    # Build the mapper.json annotations, and get geo_select for geo_coding
    # admin level if set annotating lat/lng pairs.
    mixmasta_ready_annotations, geo_select = build_mapper(uuid)
    
    d = f"data/{uuid}"
    fp = ""
    meta = {}
    fn = None
    if "raw_excel" in [x.split(".")[0] for x in os.listdir(d)]:
        fn = [x for x in os.listdir(d) if x.split(".")[0] == "raw_excel"][0]
        fp = f"{d}/{fn}"
        xl = json.load(open(f"data/{uuid}/excel_info.json", "r"))
        meta = {"ftype": "excel", "sheet": xl["excel_Sheet"]}
    elif "raw_tiff" in [x.split(".")[0] for x in os.listdir(d)]:
        fn = [x for x in os.listdir(d) if x.split(".")[0] == "raw_tiff"][0]
        fp = f"{d}/{fn}"
        tif = json.load(open(f"data/{uuid}/geotiff_info.json", "r"))
        {
            "geotiff_Feature_Name": "feat",
            "geotiff_Band": "1",
            "geotiff_Null_Val": "-9999",
            "geotiff_Date": "",
        }
        meta = {
            "ftype": "geotiff",
            "feature_name": tif["geotiff_Feature_Name"],
            "band_name": tif["geotiff_Band"],
            "null_val": tif["geotiff_Null_Val"],
            "date": tif["geotiff_Date"],
        }

    elif "raw_cdf" in [x.split(".")[0] for x in os.listdir(d)]:
        fn = [x for x in os.listdir(d) if x.split(".")[0] == "raw_cdf"][0]
        fp = f"{d}/{fn}"
        meta = {"ftype": "netcdf"}
    else:
        fn = f"{d}/raw_data.csv"
        fp = fn
        meta = {"ftype": "csv"}

    # Update meta with geocode_level if set as geo_select above.
    # If present Mimaxta will override admin param with this value.
    # Meant for use with DMC model runs.
    if geo_select != None:
        meta["geocode_level"] = geo_select

    mixmasta_ready_annotations["meta"] = meta
    json.dump(
        mixmasta_ready_annotations,
        open(f"data/{uuid}/mixmasta_ready_annotations.json", "w"),
    )

    json.dump(
        mixmasta_ready_annotations,
        open(f"data/{uuid}/sent_to_mixmasta.json", "w"),
    )

    logging_preface = cache_get(uuid, "logging_preface", None)
    logging.info(f"{logging_preface} - Began mixmasta process")

    mix_start_time = time.perf_counter()

    ### BYOM handling
    if cache_get(uuid, "byom", False):
        # Default to admin2 if geo_select is not set or too precise.
        if geo_select in (None, "admin3"):
            admin_level = "admin2"
        else:
            admin_level = geo_select
            logging.info(f"{logging_preface} - set admin_level to {admin_level}")
        
        byom_annotations = copy.deepcopy(mixmasta_ready_annotations)
        fn = f"{d}/raw_data_byom_sample.csv"
        fp = fn
        byom_annotations["meta"] = {"ftype": "csv"}
        json.dump(
            byom_annotations,
            open(f"data/{uuid}/byom_annotations.json", "w"),
        )
        mapper = "byom_annotations"

    ### BYOD handling
    else:
        # Default to admin3 if geo_select is not set.
        if geo_select == None:
            admin_level = "admin3"
        else:
            admin_level = geo_select
            logging.info(f"{logging_preface} - set admin_level to {admin_level}")
        
        mapper = "mixmasta_ready_annotations"

    # Set gadm level based on geocoding level; still using gadm2 for gadm0/1.
    gadm_level = gadm3 if admin_level == "admin3" else gadm2

    ret, rename = mix.process(
        fp, f"data/{uuid}/{mapper}.json", admin_level, f"{d}/{uuid}", gadm=gadm_level
    )

    mix_end_time = time.perf_counter()
    logging.info(
        f"{logging_preface} - Ended mixmasta process: took {mix_end_time - mix_start_time:0.2f} seconds"
    )

    primary_date_renames = []
    primary_geo_renames = {}

    to_rename = []
    already_done = []

    for x in rename.values():
        for y in x:
            to_rename.append(y)
    for t in ["geo", "date", "feature"]:
        to_add = []
        for i in range(len(mixmasta_ready_annotations[t])):
            if mixmasta_ready_annotations[t][i]["name"] in to_rename:
                for x in rename.keys():
                    if mixmasta_ready_annotations[t][i]["name"] in rename[x]:
                        mixmasta_ready_annotations[t][i]["name"] = x
                        mixmasta_ready_annotations[t][i]["display_name"] = x
            if "qualifies" in mixmasta_ready_annotations[t][i].keys():
                for x_i in range(len(mixmasta_ready_annotations[t][i]["qualifies"])):
                    if mixmasta_ready_annotations[t][i]["qualifies"][x_i] in to_rename:
                        for x in rename.keys():
                            if (
                                mixmasta_ready_annotations[t][i]["qualifies"][x_i]
                                in rename[x]
                            ):
                                mixmasta_ready_annotations[t][i]["qualifies"][x_i] = x

    for x in mixmasta_ready_annotations["date"]:
        if "primary_date" in x.keys():
            if x["primary_date"] == True:
                primary_date_renames.append(x["name"])

    for x in mixmasta_ready_annotations["geo"]:
        if "primary_geo" in x.keys():
            if x["primary_geo"] == True:
                # primary_geo_renames.append(x["name"]) # RTK
                primary_geo_renames[x["name"]] = x["geo_type"]

    primary_date_renamed = False
    new_dates = []
    added = []

    for entry in mixmasta_ready_annotations["date"]:
        if entry["name"] in primary_date_renames:
            if not primary_date_renamed:
                # only pulls one of the primary_dates in this keeps us from pulling all of the build a dates
                e = entry.copy()
                e["name"] = "timestamp"
                e["display_name"] = "timestamp"
                primary_date_renamed = True
                new_dates.append(e)
                added.append(e["name"])

        else:
            if entry["name"] not in added:
                new_dates.append(entry)
                added.append(entry["name"])

    mixmasta_ready_annotations["date"] = new_dates

    primary_geo_renamed = False
    new_geos = []
    added = []

    # Iterate the geo annotations and change the name of all entities that are
    # primary_geo.

    primary_geo_rename_count = 0  # RTK

    for entry in mixmasta_ready_annotations["geo"]:
        # if entry["name"] in primary_geo_renames: # RTK
        if entry["name"] in primary_geo_renames.keys():
            # if not primary_geo_renamed: # RTK
            if primary_geo_rename_count < len(primary_geo_renames):
                primary_geo_rename_count += 1
                for new_name in ["admin1", "admin2", "admin3", "country", "lat", "lng"]:
                    # Don't add again, although duplicates are removed below.
                    if new_name in added:
                        continue
                    e = entry.copy()
                    e["name"] = new_name
                    e["display_name"] = new_name
                    e["type"] = new_name
                    primary_geo_renamed = True
                    new_geos.append(e)
                    added.append(e["name"])
        else:
            if entry["name"] not in added:
                new_geos.append(entry)
                added.append(entry["name"])

    mixmasta_ready_annotations["geo"] = new_geos
    entry_names = []

    # Looks like this removes duplciates with the same name.
    for t in ["geo", "date", "feature"]:
        entries = []
        for e in mixmasta_ready_annotations[t]:
            if e not in entry_names:
                entries.append(e)
                entry_names.append(e["name"])
        mixmasta_ready_annotations[t] = entries

    json.dump(
        mixmasta_ready_annotations,
        open(f"data/{uuid}/mixmasta_ready_annotations.json", "w"),
    )

    # As the csv can take a long time to write, we can use the "mixmasta_processed_writing" as a sentinel whose
    # existence indicates that the process of writing the file is not yet done.
    open(f"data/{uuid}/mixmasta_processed_writing", "w").close()
    ret.to_csv(f"data/{uuid}/mixmasta_processed_df.csv", index=False)
    os.remove(f"data/{uuid}/mixmasta_processed_writing")
