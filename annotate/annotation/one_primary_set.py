from .associations import one_primary
from utils.cache_helper import cache_set


def one_primary_set(annotations, context):
    """set primary caches based on the annotations"""
    uuid = context["uuid"]
    (
        primary_time_set,
        primary_country_set,
        primary_admin1_set,
        primary_admin2_set,
        primary_admin3_set,
        primary_coord_set,
    ) = one_primary(annotations)

    primaries = {
        "primary_time_set": primary_time_set,
        "primary_country_set": primary_country_set,
        "primary_admin1_set": primary_admin1_set,
        "primary_admin2_set": primary_admin2_set,
        "primary_admin3_set": primary_admin3_set,
        "primary_coord_set": primary_coord_set,
    }

    for label in primaries:
        cache_set(uuid, label, primaries[label])

    return True
