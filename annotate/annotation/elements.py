def single_text_field(idx, prompt, default_value=None, add=None, required=True):
    """this is a doc string"""
    l1 = """<label for="{}">{}</label>""".format(idx, prompt)

    if default_value == None:
        value_addition = ""
    else:
        value_addition = f'value="{default_value}'

    if default_value == None:
        default_value = ""

    l2 = f"""<input class="form-control" {add} type="text" id="{idx}" name="{idx}" value="{default_value}" required="True"></input>""".replace(
        '"None"', ""
    )
    if not required:
        l2 = l2.replace('''required="True"''', "")
    return "\n".join([l1, l2])


def single_choice_field(
    idx,
    prompt,
    options,
    default_value="",
    label=True,
    searchable=True,
    label_add=None,
    add=None,
    option_line_add=None,
):
    l1 = f"""<label for="{idx}" id={idx}_label {label_add}>{prompt}</label>"""
    if searchable:
        searchable_addition = 'data-live-search="true"'
    else:
        searchable_addition = ""

    if add == None:
        add = ""

    l2 = f"""<select class="selectpicker" id="{idx}" name="{idx}" {add} {searchable_addition}>"""

    if label:
        lines = [l1, l2]
    else:
        lines = [l1]

    if option_line_add != None:
        lines.append(option_line_add)

    for opt in options:
        if isinstance(opt, (list, tuple)):
            opt_label, opt_value = opt
        else:
            opt_label, opt_value = opt, opt
        if opt_value == default_value:
            line = f"""<option value="{opt_value}" selected>{opt_label}</option>"""
        else:
            line = f"""<option value="{opt_value}">{opt_label}</option>"""
        lines.append(line)

    lines.append("""</select>""")
    lines = "\n".join(lines)
    wrap = f'<div class="dropdown bootstrap-select"> {lines} </div>'
    return wrap


def checkbox(idx, value, prompt, row_id=None, to_add=""):
    l1 = f"""<input class="form-control" type="checkbox" {to_add} id="{idx}" name="{idx}" value="{value}"/>"""
    l2 = """<label style='margin-left:10px;' for="{}">{}</label>""".format(idx, prompt)
    if row_id == None:
        return (
            '<div class = "row">' + join_forms([l1, l2]).replace("<br>", "") + "</div>"
        )
    else:
        checker = (
            '<div class = "input-group" id = {}>'.format(row_id)
            + join_forms([l1, l2]).replace("<br>", "")
            + "</div>"
        )
        return checker


def post_to_dict(request):
    ret = {}
    for k in request.POST.keys():
        if k == "csrfmiddlewaretoken":
            continue
        ret[k] = request.POST[k]
    return ret


def join_forms(forms, idx=None, br=True):
    if idx != None:
        ret = f"<div id={idx}>"
        if br:
            ret += "<br>".join(forms)
        else:
            ret += "".join(forms)
        return ret + "</div>"

    return "<br>".join(forms)
