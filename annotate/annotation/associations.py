def generate_associated_dt_annotation(
    associations, orig_col, primary_time=False, description="", qualifies=None
):
    """if associated with another col through dt also annotate that col"""
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


def one_primary(annotations):
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
