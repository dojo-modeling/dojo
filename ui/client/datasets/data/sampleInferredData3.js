export default {
  "iso": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "ISO3",
      "fuzzyCategory": "ISO3",
      "ratio": 86
    }
  },
  "event_id_cnty": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "event_id_no_cnty": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "event_date": {
    "category": "time",
    "subcategory": "date",
    "format": "%d-%m-%y",
    "match_type": [
      "LSTM"
    ],
    "Parser": "Util",
    "DayFirst": true,
    "fuzzyColumn": null
  },
  "year": {
    "category": "time",
    "subcategory": "date",
    "format": "%Y",
    "match_type": [
      "LSTM",
      "fuzzy"
    ],
    "Parser": "Util",
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Year",
      "fuzzyCategory": "Year",
      "ratio": 100
    }
  },
  "time_precision": {
    "category": "time",
    "subcategory": "date",
    "format": "%m",
    "match_type": [
      "LSTM"
    ],
    "Parser": "Util",
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "event_type": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "sub_event_type": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "actor1": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "assoc_actor_1": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "inter1": {
    "category": "time",
    "subcategory": "date",
    "format": "%m",
    "match_type": [
      "LSTM"
    ],
    "Parser": "Util",
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "actor2": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "assoc_actor_2": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "inter2": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "interaction": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "region": {
    "category": "geo",
    "subcategory": "region",
    "format": null,
    "match_type": [
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Region",
      "fuzzyCategory": "Region",
      "ratio": 100
    }
  },
  "country": {
    "category": "geo",
    "subcategory": "country_name",
    "format": null,
    "match_type": [
      "LSTM",
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Country",
      "fuzzyCategory": "Country",
      "ratio": 100
    }
  },
  "admin1": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "admin2": {
    "category": "geo",
    "subcategory": "city_name",
    "format": null,
    "match_type": [
      "LSTM"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "admin3": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "location": {
    "category": "geo",
    "subcategory": null,
    "format": null,
    "match_type": [
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Location",
      "fuzzyCategory": "Location",
      "ratio": 100
    }
  },
  "geo_precision": {
    "category": "time",
    "subcategory": "date",
    "format": "%m",
    "match_type": [
      "LSTM"
    ],
    "Parser": "Util",
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "source": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "source_scale": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "notes": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "fatalities": {
    "category": null,
    "subcategory": null,
    "format": null,
    "match_type": [],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": null
  },
  "timestamp": {
    "category": "time",
    "subcategory": "date",
    "format": "Unix Timestamp",
    "match_type": [
      "LSTM",
      "fuzzy"
    ],
    "Parser": "Util",
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Timestamp",
      "fuzzyCategory": "Timestamp",
      "ratio": 100
    }
  },
  "latitude": {
    "category": "geo",
    "subcategory": "latitude",
    "format": null,
    "match_type": [
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Latitude",
      "fuzzyCategory": "Latitude",
      "ratio": 100
    }
  },
  "longitude": {
    "category": "geo",
    "subcategory": "longitude",
    "format": null,
    "match_type": [
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "Longitude",
      "fuzzyCategory": "Longitude",
      "ratio": 100
    }
  },
  "iso3": {
    "category": "geo",
    "subcategory": "ISO3",
    "format": null,
    "match_type": [
      "fuzzy"
    ],
    "Parser": null,
    "DayFirst": null,
    "fuzzyColumn": {
      "matchedKey": "ISO3",
      "fuzzyCategory": "ISO3",
      "ratio": 100
    }
  }
};
