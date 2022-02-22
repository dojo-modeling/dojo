import os
import json
from utils.cache_helper import cache_set
import numpy as np


def gen_samples(uuid, df):
    """generate annotations_samples and assign it to the cache"""
    annotation_samples = {}
    for c in df.columns:
        annotation_samples[c] = [str(i) for i in list(df[c].dropna()[:5])]
        while len(annotation_samples[c]) < 5:
            annotation_samples[c].append(np.nan)
    cache_set(uuid, "annotation_samples", annotation_samples)


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
                        f'option value="{x}"', f'option value="{x}" selected'
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
                    idx
                    in [
                        "Type",
                        "Time",
                        "Geo",
                        "Coord_Pair_Form",
                        "Data_Type",
                        "Geo_Select_Form",
                    ]
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
