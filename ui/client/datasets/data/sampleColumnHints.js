export default {
  date: {
    category: 'time', // type=date
    subcategory: 'date', // subcategory=date
    format: '%Y-%m-%d',
    match_type: [
      'fuzzy',
      'LSTM'
    ],
    Parser: 'Util',
    DayFirst: false,
    fuzzyColumn: {
      matchedKey: 'Date',
      fuzzyCategory: 'Date',
      ratio: 100
    }
  },
  value: {
    category: 'geo',
    subcategory: 'latitude',
    format: null,
    match_type: [
      'LSTM'
    ],
    Parser: null,
    DayFirst: null,
    fuzzyColumn: null
  },
  color_hue: {
    category: null,
    subcategory: null,
    format: null,
    match_type: [],
    Parser: null,
    DayFirst: null,
    fuzzyColumn: null
  },
  latitude: {
    category: 'geo', // type=geo
    subcategory: 'latitude', // format=latitude
    format: null,
    match_type: [
      'fuzzy'
    ],
    Parser: null,
    DayFirst: null,
    fuzzyColumn: {
      matchedKey: 'Latitude',
      fuzzyCategory: 'Latitude',
      ratio: 100
    }
  },
  longitude: {
    category: 'geo',
    subcategory: 'longitude',
    format: null,
    match_type: [
      'fuzzy'
    ],
    Parser: null,
    DayFirst: null,
    fuzzyColumn: {
      matchedKey: 'Longitude',
      fuzzyCategory: 'Longitude',
      ratio: 100
    }
  }
};
