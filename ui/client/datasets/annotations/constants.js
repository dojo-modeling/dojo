
// NOTE date is used by API annotations, time is used by geoclassify metadata
//           UI is using time
// NOTE geoclassify metadata uses category, API uses type. UI uses category.
export const CATEGORIES = {
  time: 'time',
  geo: 'geo',
  feature: 'feature'
};

export const GEO_ADMINS = {
  admin0: 'country',
  admin1: 'state/territory',
  admin2: 'county/district',
  admin3: 'municipality/town'
};

export const LATLON_MAPPINGS = {
  latitude: [
    "latitude",
    "lat",
    "y",
    "GPS: Latitude",
    "d_latitude",
    "destination_latitude",
    "start_latitude",
    "end_latitude",
    "Decimal degree latitude",
    "port_latitude",
    "origin city",
  ],
  longitude: [
    "longitude",
    "lon",
    "x",
    "lng",
    "long",
    "Decimal degree longitude",
    "GPS: Longitude",
    "d_longitude",
    "Groundwater Site",
    "destination_longitude",
    "end_longitude",
    "lat_bounds",
    "port_longitude",
    "start_longitude",
    "origin city",
    "y",
  ]
};
