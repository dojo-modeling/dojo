/* eslint-disable no-undef */
import { genInitialValues } from './ColumnPanel';

/**
 * For now all possible form values are initialized
 *   (even for categories other than selected).
 * This is to fully control all the fields (set defaults for them),
 * without having to do it JIT while the user is making mind on item category.
 * */

describe('genInitialValues', () => {
  test('Merges date base + inferred data, ignoring nulls from input', () => {
    const inferredDate = {
      category: 'time',
      subcategory: 'date',
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
      },
      type_inference: 'str'
    };

    const result = genInitialValues(inferredDate);

    expect(result).toEqual({
      aliases: [],
      category: 'time',
      display_name: '',
      description: '',
      feature_type: 'str',
      units: '',
      units_description: '',
      isQualifies: false,
      qualifierrole: 'breakdown',
      qualifies: [],
      geo_type: 'latitude',
      gadm_level: 'admin3',
      coord_format: 'lonlat',
      primary: false,
      resolve_to_gadm: false,
      'geo.coordinate-pair': false,
      'geo.coordinate-pair-column': '',
      'geo.multi-column': false,
      'geo.multi-column.admin0': '',
      'geo.multi-column.admin1': '',
      'geo.multi-column.admin2': '',
      'geo.multi-column.admin3': '',
      date_type: 'date',
      time_format: '%Y-%m-%d',
      'date.multi-column': false,
      'date.multi-column.day': '',
      'date.multi-column.month': '',
      'date.multi-column.year': '',
      'date.multi-column.year.format': '',
      'date.multi-column.month.format': '',
      'date.multi-column.day.format': '',
    });
  });

  test('Merges geo base + inferred data, ignoring nulls from input', () => {
    const inferredGeo = {
      category: 'geo',
      subcategory: 'latitude',
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
    };

    const columns = [{field: 'x'}, {field: 'longitude'}, {field: 'value'}, {field: 'something'}];

    const result = genInitialValues(inferredGeo, columns);

    expect(result).toEqual({
      aliases: [],
      category: 'geo',
      display_name: '',
      description: '',
      feature_type: 'float',
      units: '',
      units_description: '',
      isQualifies: false,
      qualifierrole: 'breakdown',
      qualifies: [],
      geo_type: 'latitude',
      gadm_level: 'admin3',
      coord_format: 'lonlat',
      primary: false,
      resolve_to_gadm: false,
      'geo.coordinate-pair': false,
      "geo.coordinate-pair-column": 'longitude',
      'geo.multi-column': false,
      'geo.multi-column.admin0': '',
      'geo.multi-column.admin1': '',
      'geo.multi-column.admin2': '',
      'geo.multi-column.admin3': '',
      date_type: 'year',
      time_format: '',
      'date.multi-column': false,
      'date.multi-column.day': '',
      'date.multi-column.month': '',
      'date.multi-column.year': '',
      'date.multi-column.year.format': '',
      'date.multi-column.month.format': '',
      'date.multi-column.day.format': '',
    });
  });

  test('Merges feature base + inferred data, ignoring nulls/undefined from input', () => {
    const inferredNull = {
      category: null,
      subcategory: null,
      format: null,
      match_type: [],
      Parser: null,
      DayFirst: null,
      fuzzyColumn: null,
      type_inference: undefined
    };

    const result = genInitialValues(inferredNull);

    expect(result).toEqual({
      aliases: [],
      category: 'feature',
      display_name: '',
      description: '',
      feature_type: 'float',
      units: '',
      units_description: '',
      isQualifies: false,
      qualifierrole: 'breakdown',
      qualifies: [],
      geo_type: 'latitude',
      gadm_level: 'admin3',
      coord_format: 'lonlat',
      primary: false,
      resolve_to_gadm: false,
      'geo.coordinate-pair': false,
      'geo.coordinate-pair-column': '',
      'geo.multi-column': false,
      'geo.multi-column.admin0': '',
      'geo.multi-column.admin1': '',
      'geo.multi-column.admin2': '',
      'geo.multi-column.admin3': '',
      date_type: 'year',
      time_format: '',
      'date.multi-column': false,
      'date.multi-column.day': '',
      'date.multi-column.month': '',
      'date.multi-column.year': '',
      'date.multi-column.year.format': '',
      'date.multi-column.month.format': '',
      'date.multi-column.day.format': '',
    });
  });
});
