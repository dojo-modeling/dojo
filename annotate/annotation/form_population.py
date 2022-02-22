import pandas as pd
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
    alias_form,
    qualifier_role_form
)
import logging
from utils.cache_helper import cache_get
from .helper_functions import apply_annotations


class Form:
    def __init__(self, annotations, gc, df, col, uuid):
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
        self.gc = gc
        self.annotations = annotations
        self.df = df
        self.context = {}
        self.uuid = uuid
        self.main()

    def main(self):
        """create forms"""
        (
            self.geo_form_def_val,
            self.base_annotation_def_val,
            self.time_form_def_val,
            self.date_validation_def_val,
        ) = self.set_default_form_vals()

        self.alias_form_def_val = self.annotations.get(self.col, {}).get(
            "aliases", None
        )
        self.qualifier_role_def_val = self.annotations.get(self.col, {}).get(
            'qualifierRole', None)

        self.possible_time_associations = self.get_possible_time_associations()
        self.create_forms()

    def get_possible_time_associations(self):
        """what are the possible time associations"""
        gc, annotations, col = self.gc, self.annotations, self.col

        possible_time_associations = {}
        strftime_conversion = self.strftime_conversion
        for k in gc.keys():
            entry = gc[k]
            if entry["category"] == "time":
                date_format = entry["format"]
                if date_format:
                    if date_format.count("%") == 1:
                        for x in strftime_conversion.keys():
                            if date_format.find(x) != -1:
                                possible_time_associations[k] = date_format
        if annotations.get("col", False):
            if annotations.get("col", {}).get("associated_cols", False):
                del possible_time_associations
                possible_time_associations = {}
                for x in annotations[col]["associated_columns"].keys():
                    col_to_add = annotations[col]["associated_columns"][x]
                    possible_time_associations[col_to_add] = annotations[col_to_add][
                        "format"
                    ]
            df = None
        return possible_time_associations

    def create_forms(self):
        (
            base_annotation_def_val,
            time_form_def_val,
            date_validation_def_val,
            geo_form_def_val,
            qualifier_role_def_val,
            alias_form_def_val,
            possible_time_associations,
            df,
        ) = (
            self.base_annotation_def_val,
            self.time_form_def_val,
            self.date_validation_def_val,
            self.geo_form_def_val,
            self.qualifier_role_def_val,
            self.alias_form_def_val,
            self.possible_time_associations,
            self.df,
        )
        context = self.context
        col = self.col
        annotations = self.annotations
        uuid = self.uuid
        logging.warn(
            [
                base_annotation_def_val,
                time_form_def_val,
                date_validation_def_val,
                geo_form_def_val,
            ]
        )

        context["df"] = (
            pd.DataFrame(df.dropna(subset=[col])[:5])
            .to_html(escape=False, index=False)
            .replace("<table", '<table class="tableBoot" id="annotation_table"')
        )
        context["base_form"] = base_annotation(
            col, "base", def_type=base_annotation_def_val, def_name=col
        )
        context["aliases"] = alias_form(alias_form_def_val)
        context['qualifier_role_form'] = qualifier_role_form(qualifier_role_def_val)

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
            primary_admin1_set=cache_get(uuid, "primary_admin1_set", False),
            primary_admin2_set=cache_get(uuid, "primary_admin2_set", False),
            primary_admin3_set=cache_get(uuid, "primary_admin3_set", False),
            primary_coord_set=cache_get(uuid, "primary_coord_set", False),
        )

        context["coordinate_pair"] = coord_form(col, "cordPair")
        context["base_time_form"] = time_form(
            col,
            "baseTime",
            def_val=time_form_def_val,
            primary_time_set=cache_get(uuid, "primary_time_set", False),
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
            context[x] = apply_annotations(context[x], col, uuid)

        context["columns"] = {value: count for count, value in enumerate(df.columns)}
        counter = 1
        for x in df.columns:
            if x == col:
                context["curr_col_no"] = counter
                break
            else:
                counter += 1

        self.context = context

    def set_default_form_vals(self):
        """default vals for form population (any)"""
        annotations, col, gc = self.annotations, self.col, self.gc
        strftime_conversion = self.strftime_conversion
        (
            base_annotation_def_val,
            time_form_def_val,
            date_validation_def_val,
            geo_form_def_val,
            alias_form_def_val,
        ) = (None, None, None, None, None)

        if not annotations.get(col, False):
            if gc.get(col, False):
                return self.set_def_form_vals_geotime_detected()

        for k in gc.keys():
            entry = gc[k]
            if entry["category"] == "geo":
                pass
        if base_annotation_def_val == None:
            if annotations.get(col, False):
                if not annotations.get(col, {}).get("Type", False):
                    base_annotation_def_val = "Feature"
        return (
            geo_form_def_val,
            base_annotation_def_val,
            time_form_def_val,
            date_validation_def_val,
        )

    def set_def_form_vals_geotime_detected(self):
        """default vals for form population when geotime is detected"""
        gc, annotations, col = self.gc, self.annotations, self.col
        strftime_conversion = self.strftime_conversion
        entry = gc[col]
        cat = entry.get("category", False)
        logging.warn("entry")
        logging.warn(entry)
        (
            geo_form_def_val,
            base_annotation_def_val,
            time_form_def_val,
            date_validation_def_val,
        ) = (None, None, None, None)
        if cat == "geo":
            geo_form_def_val = entry["subcategory"]
            base_annotation_def_val = "Geo"
            time_form_def_val = None
            date_validation_def_val = None
        elif cat == "time":
            # if this has been detected as a time
            time_form_def_val = entry["subcategory"]
            date_validation_def_val = entry["format"]
            # strftime_format
            if date_validation_def_val:
                if date_validation_def_val.count("%") == 1:
                    for x in strftime_conversion.keys():
                        if date_validation_def_val.find(x) != -1:
                            time_form_def_val = strftime_conversion[x]
            geo_form_def_val = None
        else:
            base_annotation_def_val = "Feature"
        logging.warn(
            [
                geo_form_def_val,
                base_annotation_def_val,
                time_form_def_val,
                date_validation_def_val,
            ]
        )
        return (
            geo_form_def_val,
            base_annotation_def_val,
            time_form_def_val,
            date_validation_def_val,
        )
