// part of response from backend for first sampleData.js file only
// Sample call that would return such data: `/api/dojo/indicators/${datasetInfo.id}/annotations
// This object would be keyed in its reponse within `geoClassify.data.annotations`
export default {
    "geo": [
      {
        "name": "latitude",
        "display_name": "lat-only-annotated",
        "description": "",
        "type": "geo",
        "geo_type": "latitude",
        "primary_geo": false,
        "resolve_to_gadm": false,
        "is_geo_pair": null,
        "coord_format": "lonlat",
        "qualifies": [],
        "aliases": {}
      }
    ],
    "date": [
      {
        "name": "date",
        "display_name": "date-annotated",
        "description": "",
        "type": "date",
        "date_type": "date",
        "primary_date": true,
        "time_format": "%Y-%m-%d",
        "associated_columns": null,
        "qualifies": [],
        "aliases": {}
      }
    ],
    "feature": [
      {
        "name": "value",
        "display_name": "feature-val-annotation",
        "description": "some-feat-desc",
        "type": "feature",
        "feature_type": "float",
        "units": "m",
        "units_description": "mm",
        "qualifies": [],
        "qualifierrole": "breakdown",
        "aliases": {}
      },
      {
        "name": "color_hue",
        "display_name": "qualifies-value",
        "description": "ffe",
        "type": "feature",
        "feature_type": "str",
        "units": "",
        "units_description": "",
        "qualifies": [
          "value"
        ],
        "qualifierrole": "weight",
        "aliases": {}
      }
    ]
};
