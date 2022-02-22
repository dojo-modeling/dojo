def rename(
    val,
    rename_di,
):
    """
    only rename the end values of nested dictionary {ignore : {ignore : {ignore : target}, ignore_2 : target}}
    val = {ignore : {ignore : {ignore : target}, ignore_2 : target}}
    rename_di = {ignore: 1, target: 2, ignore_2: 3}
    output {ignore : {ignore : {ignore : 2}, ignore_2 : 2}}
    """

    if isinstance(val, dict):
        # if it is a dicitonary recursively crawl through each child element regardless of their type
        ret = {}
        for y in val:
            ret[y] = rename(val[y], rename_di)
        return ret

    if isinstance(val, list):
        # if it is a list recursively crawl through each child element regardless of their type
        ret = []
        for y in val:
            ret.append(rename(y, rename_di))
        return ret

    if isinstance(val, str):
        # if it is a string check if it is in the rename dictionary
        # return either the renamed value or the original string
        if val in rename_di:
            val = rename_di[val]
            return val
        else:
            return val

    # if it is not a list, dictionary, or string return the original value

    # if it is not a string we don't have to replace it
    # if it is not a dictionary or list we don't have to recursively crawl through it
    return val
