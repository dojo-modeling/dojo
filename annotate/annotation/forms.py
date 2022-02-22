from .elements import (
    single_text_field,
    single_choice_field,
    checkbox,
    post_to_dict,
    join_forms,
)

FIXED_TIME = ["Year", "Month", "Day", "Epoch"]

TIME = [
    "Date",  # USER FORMAT WITH SUGGESTIONS
]

FIXED_GEO = [
    "Latitude",
    "Longitude",
    "Coordinates",
    "Country",
    "ISO2",
    "ISO3",
    "State/Territory",
    "County/District",
    "Municipality/Town",
]

D_TYPES = ["Float", "Int", "String", "Binary", "Boolean"]
ret = []


def gridify(els, idx=None, hr=False):
    els = [
        f"""<div class="col-md">
              {x}
            </div>"""
        for x in els
    ]
    els = "\n".join(els)

    if hr:
        ret = f"""<div class="container" id="{idx}">
              <div class="row">
                {els}
              </div>
              <hr>
            </div>"""
    else:
        ret = f"""<div class="container" id="{idx}">
          <div class="row">
            {els}
          </div>
        </div>"""

    return ret


def add_tag(el, to_add):
    el = el.split(">")
    fin = ">".join(el[1:])
    new_el = f"{el[0]} {to_add}> {fin}"
    return new_el


def date_validation(def_val, idx=None):
    ref = """<a style='color:blue;' target="_blank" href=https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes>
                    Formatting reference
                </a>"""
    validator = single_text_field(
        "dateFormat",
        f"Date Format ({ref})",
        add="oninput=dateValidation(this)",
        default_value=def_val,
    )
    return validator


def base_annotation(colname, columns, idx=None, def_type=None, def_name=None):
    if def_name == None:
        def_name = colname
    display_name = single_text_field(
        "column_Name", "Column Name", default_value=colname
    )
    for x in ["-", "_"]:
        def_name = def_name.replace(x, " ")

    def_name = def_name.title()
    column_name = single_text_field("Name", "Display Name", default_value=def_name)
    description = single_text_field("Description", "Description").replace(
        "input", "textarea"
    )
    if def_type == "time":
        def_type = "Date"
    elif def_type != None:
        def_type = def_type.capitalize()
    types = single_choice_field(
        "Type",
        "Type:",
        ["Date", "Geo", "Feature"],
        default_value=def_type,
        searchable=False,
    )

    return join_forms([display_name, column_name, description, types], idx)


def qualify_checkbox():
    c1 = checkbox("qualify", "true", "This field qualifies another", "qualifyCheckbox")
    return c1

def geo_form(
    colname,
    idx=None,
    def_val="",
    other_geo=[],
    primary_geo_fields=[],
    primary_country_set=False,
    primary_admin1_set=False,
    primary_admin2_set=False,
    primary_admin3_set=False,
    primary_coord_set=False,
):
    """
    Parameters
    ----------
    primary_geo_fields: list
        Names of fields marked primary_geo=True in annotation.

    """
    if def_val == "country_name":
        def_val = "Country"
    if def_val == "longitude":
        def_val = "Longitude"
    if def_val == "latitude":
        def_val = "Latitude"
    if def_val == "state_name":
        def_val = "State/Territory"
    if def_val == "city":
        def_val = "Municipality/Town"

    # Old code to display an on-check alert if primary_geo already set.
    # if primary_geo_set:
    #    t = "geo"
    #    addition = 'oninput=if(this.checked){my_func("' + t + '")}'
    # else:
    #    addition = ""

    # Prepare attributes to add to primary_geo HTML Element. These will specify
    # the Geo Types (e.g. State/Territory) and column names ("State1")
    # currently set to primary_geo.
    #
    # These are used in annotation.html addPrimaryGeoAlert()
    addition = ""
    if primary_country_set:
        addition = addition + "[Country],"

    if primary_admin1_set:
        addition = addition + "[State/Territory],"

    if primary_admin2_set:
        addition = addition + "[County/District],"

    if primary_admin3_set:
        addition = addition + "[Municipality/Town],"

    if primary_coord_set:
        addition = addition + "[Coordinates],"

    # Add primary_geo attribute.
    addition = 'primary_geo="' + addition + '"'

    # Add primary_geo_columns attribute.
    addition = addition + ' primary_geo_columns="'
    for col in primary_geo_fields:
        addition = addition + f"[{col}],"
    addition = addition + '"'

    # Remove this column name from the list of primary geo fields and simply
    # annotate the checkbox prompt to indicate these are linked.
    if colname in primary_geo_fields:
        primary_geo_fields.remove(colname)

    checkbox_prompt = "This is a primary geo field"
    # TODO Need to know geo_format of the annotating column to determine whether
    # to add primary_geo_fields to prompt. Example is ISO2/ISO3/Country where
    # these are mutally exclusive.
    if len(primary_geo_fields) > 0:
        checkbox_prompt = checkbox_prompt + " with " + ", ".join(primary_geo_fields)

    # Create the checkbox object with the additional attributes.
    c1 = checkbox(
        "primary_geo",
        "true",
        checkbox_prompt,
        "primary_geo_row",
        to_add=addition,
    )

    c2 = checkbox("resolve_to_gadm", "true", "Resolve to GADM", "resolveToGadmCheckbox")

    g_form = single_choice_field("Geo", "Format", FIXED_GEO, def_val)

    return join_forms([g_form, c1, c2], idx, br=False)


def coord_form(colname, def_val=""):
    return single_choice_field(
        "Coordinate_Format",
        "Coordinate_Format",
        ["Longitude,Latitude", "Latitude,Longitude"],
    )


def date_association_checkbox():
    c1 = checkbox(
        "dateAssociation",
        "true",
        "This field is part of a multi-column date",
        "date_association_row",
    )
    return add_tag(c1, "selected")


def cord_association_checkbox():
    c2 = checkbox(
        "isGeoPair", "true", "This is part of a coordinate pair", "geo_pair_row"
    )

    return c2


def time_form(colname, idx, def_val="", other_times=[], primary_time_set=False):
    if def_val != None:
        if def_val.capitalize() in FIXED_TIME + TIME:
            def_val = def_val.capitalize()
    s1 = single_choice_field(
        "Time", "Time Subcategory:", FIXED_TIME + TIME, def_val, searchable=False
    )

    if primary_time_set:
        t = "time"
        addition = 'oninput=if(this.checked){my_func("' + t + '")}'
    else:
        addition = ""

    c1 = checkbox(
        "primary_time",
        "true",
        "This is my primary time field",
        "primary_time_row",
        to_add=addition,
    )
    return join_forms([s1, c1], idx)


def cord_pair_form(cols, def_val=""):
    s1 = single_choice_field(
        "Coord_Pair_Form",
        "Associated Coordinate Column",
        cols,
        label_add='style="width:200%;"',
    )
    return s1


# Generate html for reverse geocoding selection dropdown.
def geo_select_form(def_val=""):
    s1 = single_choice_field(
        "Geo_Select_Form",
        "Geocoding Level",
        ["admin3", "admin2", "admin1", "country"],
        label_add='style="width:200%;" span="" title="Depth to geocode: admin3: Municipality/Town, admin2: County/District, admin1:State/Territory, admin0:Country"',
    )
    return s1


def qualify_columns(cols, def_val=""):
    s1 = single_choice_field(
        "qualifyColumn",
        "Select column(s) to qualify",
        cols,
        "",
        label_add='style="width:200%;"',
        add="multiple required",
    )
    return s1


def associate_dates(columns, preselection={}):
    # recorded occurences = {"Year" : "year_column", "Monht"}
    assoc = []
    # return
    temp = ["No Associable Column"]
    for x in columns:
        temp.append(x)
    columns = temp

    strftime_conversion = {
        "Year": ["%Y", "%y"],
        "Month": ["%B", "%b", "%m", "%-m"],
        "Day": ["%d", "%A", "%a", "%j", "%-j"],
        "Hour": ["%H", "%-H", "%I", "%-I"],
        "Minute": ["%M", "%-M"],
        "Second": ["%S", "%-S"],
    }

    for x in ["Year", "Month", "Day"]:
        if x in preselection.keys():
            default_value = x
            default_format = preselection[x]
        else:
            default_value, default_format = "", ""

        inst = single_choice_field(
            f"associated_{x}", x, columns, default_value=default_value, searchable=True
        )
        options = strftime_conversion[x]
        inst2 = single_choice_field(
            f"associated_{x}_format",
            f"{x} format",
            options,
            searchable=False,
            default_value=default_format,
        )
        el = gridify([inst, inst2], idx=f"{x}_format_row", hr=True)
        assoc.append(el)

    # assoc = gridify(assoc, 'associatedDates')

    return "\n".join(assoc)


def feature_form(colname, idx=None, def_val=""):
    def_val = def_val.upper()
    if def_val == "Float64":
        def_val = "Float"
    s1 = single_choice_field(
        "Data_Type",
        "Data Type",
        [x.upper() for x in D_TYPES],
        def_val,
        searchable=False,
    )
    s2 = single_text_field("Units", "Units", "")
    s3 = single_text_field("Unit_Description", "Unit Description", "", required=False)
    return join_forms([s1, s2, s3], idx)

def alias_form(aliases):
    if not aliases:
        # If there were no aliases, return an empty string
        return ""
    else:
        forms = ""
        for ix, current in enumerate(aliases):
            new = aliases[current]
            form = f"""
                    <div class="input-group">
                            <input type="text" class="form-control" name="alias-current-{ix}" value="{current}" placeholder="Current" required/>
                            <span class="input-group-addon" style="padding-top:11px; padding-left:2px; padding-right:2px">
                              <i class="fas fa-arrow-right" style="color:grey;"></i>
                            </span>
                            <input type="text" class="form-control" name="alias-new-{ix}" value="{new}" placeholder="New" required/>
                            <a href="#/" class="remove-alias">
                              <i class="fa fa-trash text-danger" aria-hidden="true" style="padding-top:10px; padding-left:5px;"></i>
                            </a>
                    </div>            
                   """
            forms += form
        return forms


def qualifier_role_form(role=None):
    return single_choice_field(
        "qualifierRole",
        "Qualifier Role",
        [
            ("Breakdown (default)", "breakdown"),
            ("Weight", "weight"),
            ("Minimum", "minimum"),
            ("Maximum", "maximum"),
            ("Coefficient of variation", "cov"),
        ],
        label_add='style="width:200%;"',
        default_value=role,
        searchable=False
    )