from django.core.cache import cache
import json

cache_timeout = None


def cache_get(uuid: str, setting_key: str, default_value=None):
    """
    Description
    -----------
    django.core.cache get helper function.

    Parameters
    ----------
    uuid: str
        session uuid and key for cache.
    setting_key: str
        cached dictionary setting key
    default_value:
        Value to return if setting_key is not found in the dictionary.

    Returns
    -------
        value for setting_key. If not found then defaults to return None,
        or the passed default_value (e.g. "").
    """

    # Get the cached dictionary for this uuid key; default to a new {}.
    uuid_dict = cache.get(uuid, {})

    return uuid_dict.get(setting_key, default_value)


def cache_set(uuid, setting_key, setting_value, timeout=cache_timeout):
    """
    Description
    -----------
    django.core.cache set helper function.

    Parameters
    ----------
    uuid: str
        session uuid and key for cache.
    setting_key: str
        cached dictionary setting key
    setting_value: obj
        cached dictionary setting value
    timeout: int
        The number of seconds before a cache entry is considered stale. If the
        value of this settings is None, cache entries will not expire.
    """

    # Get dict for that uuid; default to empty dict.
    uuid_dict = cache.get(uuid, {})

    # Add or over-write setting_key: setting_value.
    uuid_dict[setting_key] = setting_value

    # Set the cache for uuid with the updated uuid_dict.
    cache.set(uuid, uuid_dict, timeout=timeout)


def save_cache(uuid):
    uuid_dict = cache.get(uuid, {})
    json.dump(uuid_dict, open(f"data/{uuid}/cache.json", "w"))


def load_cache(uuid):
    uuid_dict = json.load(open(f"data/{uuid}/cache.json"))

    for x in uuid_dict.keys():
        cache_set(uuid, x, uuid_dict[x])
