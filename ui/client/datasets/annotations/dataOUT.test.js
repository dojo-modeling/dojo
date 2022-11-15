/* eslint-disable no-undef */
import { formatAliasesOUT, formatAnnotationsOUT } from './dataOUT';

describe('formatAnnotationsOUT', () => {
  test('groups features with relevant information', () => {
    const input = {
      value: {
        aliases: [{ current: 'a', new: 'b' }],
        category: 'feature',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: 'm',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: false,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.feature).toEqual([{
      name: 'value',
      display_name: '',
      description: 'some description',
      type: 'feature',
      feature_type: 'float',
      units: 'm',
      units_description: '',
      qualifies: [],
      qualifierrole: 'breakdown',
      aliases: {
        a: 'b'
      }
    }]);
  });


  test('Setting isQualifies + qualifies fields array formats it out to the backend', () => {

    const input = {
      value: {
        aliases: [{ current: 'a', new: 'b' }],
        category: 'feature',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: 'm',
        units_description: '',

        isQualifies: true,
        qualifierrole: 'breakdown',
        qualifies: ['color_hue'],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: false,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.feature).toEqual([{
      name: 'value',
      display_name: '',
      description: 'some description',
      type: 'feature',
      feature_type: 'float',
      units: 'm',
      units_description: '',
      qualifies: ['color_hue'],
      qualifierrole: 'breakdown',
      aliases: {
        a: 'b'
      }
    }]);


  });

  test('Disabling back "qualifies" toggle clears the list of columns it qualifies when submitting', () => {

    const input = {
      value: {
        aliases: [{ current: 'a', new: 'b' }],
        category: 'feature',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: 'm',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: ['color_hue'],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: false,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.feature).toEqual([{
      name: 'value',
      display_name: '',
      description: 'some description',
      type: 'feature',
      feature_type: 'float',
      units: 'm',
      units_description: '',
      qualifies: [],
      qualifierrole: 'breakdown',
      aliases: {
        a: 'b'
      }
    }]);


  });

  test('groups date with relevant information', () => {
    const input = {
      dated: {
        aliases: [],
        category: 'time',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.date).toEqual([{
      name: 'dated',
      display_name: '',
      description: 'some description',
      type: 'date',
      primary_date: true,
      qualifies: [],
      qualifierrole: 'breakdown',
      aliases: {},
      date_type: 'year',
      time_format: '%y'
    }]);
  });

  test('groups geo with relevant information', () => {
    const input = {
      somegeo: {
        aliases: [],
        category: 'geo',
        display_name: '',
        description: 'some geo description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo).toEqual([{
      name: 'somegeo',
      display_name: '',
      description: 'some geo description',
      type: 'geo',
      primary_geo: true,
      qualifies: [],
      qualifierrole: 'breakdown',

      aliases: {},
      geo_type: 'latitude',
      resolve_to_gadm: false,
      coord_format: 'lonlat'
    }]);
  });

  test('Given all data populated of all types, compare with all data obj', () => {
    const input = {
      value: {
        aliases: [],
        category: 'feature',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: 'm',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: false,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      },
      dated: {
        aliases: [],
        category: 'time',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      },
      somegeo: {
        aliases: [],
        category: 'geo',
        display_name: '',
        description: 'some geo description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: true,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output).toEqual({
      feature: [
        {
          aliases: {},
          type: 'feature',
          description: 'some description',
          display_name: '',
          qualifies: [],
          qualifierrole: 'breakdown',
          feature_type: 'float',
          units_description: '',
          units: 'm',
          name: 'value'
        }
      ],
      geo: [
        {
          aliases: {},
          type: 'geo',
          description: 'some geo description',
          display_name: '',
          qualifies: [],
          qualifierrole: 'breakdown',
          geo_type: 'latitude',
          resolve_to_gadm: true,
          coord_format: 'lonlat',
          name: 'somegeo',
          primary_geo: true
        }
      ],
      date: [
        {
          aliases: {},
          type: 'date',
          description: 'some description',
          display_name: '',
          qualifies: [],
          qualifierrole: 'breakdown',
          date_type: 'year',
          time_format: '%y',
          name: 'dated',
          primary_date: true
        }
      ]
    });
  });

  test('gadm_level is set when working with a primary coordinate type geo column', () => {
    const input = {
      value: {
        aliases: [],
        category: 'feature',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: 'm',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      },
      dated: {
        aliases: [],
        category: 'time',
        display_name: '',
        description: 'some description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      },
      somegeo: {
        aliases: [],
        category: 'geo',
        display_name: '',
        description: 'some geo description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'coordinates',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: true,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.feature[0].gadm_level).toBe(undefined);
    expect(output.date[0].gadm_level).toBe(undefined);
    expect(output.geo[0].gadm_level).toBe('admin3');
  });

  test('gadm_level is not set when working with a non-primary geo column', () => {

    const input = {
      somegeo: {
        aliases: [],
        category: 'geo',
        display_name: '',
        description: 'some geo description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'coordinates',
        coord_format: 'lonlat',
        primary: false,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo[0].gadm_level).toBe(undefined);
  });

  test('gadm_level is not set when working with a primary non-coordinate geo column', () => {


    const input = {
      somegeo: {
        aliases: [],
        category: 'geo',
        display_name: '',
        description: 'some geo description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo[0].gadm_level).toBe(undefined);
  });

  test('multi column geo: coordinate pairs (lat, long)', () => {
    const input = {
      'latitude + longitude1': {
        aliases: [],
        category: 'geo',
        display_name: 'GEOLOGI',
        description: 'merged geo description',
        feature_type: 'float',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'latitude',
        coord_format: 'lonlat',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',

        'geo.coordinate-pair': true,
        'geo.coordinate-pair-column': 'longitude1',

        date_type: 'year',
        time_format: '',
        'date.multi-column': false,

        'date.multi-column.day': '',
        'date.multi-column.month': '',
        'date.multi-column.year': '',

        'date.multi-column.year.format': '',
        'date.multi-column.month.format': '',
        'date.multi-column.day.format': '',

        multiPartBase: 'latitude',
        annotated: true
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo)
      .toEqual([{
        name: 'longitude1',
        type: 'geo',
        geo_type: 'longitude',

        description: 'merged geo description',
        display_name: 'GEOLOGI',
        primary_geo: true,

        resolve_to_gadm: false,
        gadm_level: 'admin3',

        coord_format: 'lonlat',
        aliases: {},
        qualifies: [],
        qualifierrole: 'breakdown',
      }, {
        name: 'latitude',
        type: 'geo',
        geo_type: 'latitude',

        is_geo_pair: 'longitude1',

        description: 'merged geo description',
        display_name: 'GEOLOGI',
        primary_geo: true,
        gadm_level: 'admin3',

        resolve_to_gadm: false,

        coord_format: 'lonlat',
        aliases: {},
        qualifies: [],
        qualifierrole: 'breakdown',
      }]);
  });

  test('multi column date', () => {
    const input = {
      'day1 + month1 + year1': {
        aliases: [],

        category: 'time',
        display_name: 'DATEIM',
        description: 'merged date description',
        feature_type: '',
        units: '',
        units_description: '',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: '',
        coord_format: '',
        primary: true,
        resolve_to_gadm: false,
        gadm_level: 'admin3',
        'geo.coordinate-pair': false,

        'geo.coordinate-pair-column': '',

        date_type: 'year',
        time_format: '%y',
        'date.multi-column': true,

        'date.multi-column.day': 'day1',
        'date.multi-column.month': 'month1',
        'date.multi-column.year': 'year1',

        'date.multi-column.year.format': '%y',
        'date.multi-column.month.format': '%m',
        'date.multi-column.day.format': '%d',

        multiPartBase: 'year1',
        annotated: true
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.date)
      .toEqual([
        {
          name: 'day1',
          type: 'date',

          date_type: 'day',
          time_format: '%d',

          description: 'merged date description',
          display_name: 'DATEIM',
          primary_date: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
        {

          name: 'month1',
          type: 'date',

          date_type: 'month',
          time_format: '%m',

          description: 'merged date description',
          display_name: 'DATEIM',
          primary_date: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
        {

          name: 'year1',
          type: 'date',

          date_type: 'year',
          time_format: '%y',

          associated_columns: {
            Day: 'day1',
            Month: 'month1',
          },

          description: 'merged date description',
          display_name: 'DATEIM',
          primary_date: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        }]);
  });

  test('multi column geo: multiple admin columns', () => {
    const input = {
      'admin0 + admin1 + admin2 + admin3': {
        aliases: [],

        category: 'geo',
        display_name: 'SUPER_GGEO',
        description: 'merged geo description from multi admin',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'country',
        primary: true,
        gadm_level: '',
        'geo.coordinate-pair': false,

        'geo.multi-column': true,

        'geo.multi-column.admin0': 'admin0',
        'geo.multi-column.admin1': 'admin1',
        'geo.multi-column.admin2': 'admin2',
        'geo.multi-column.admin3': 'admin3',

        date_type: '',
        time_format: '',
        'date.multi-column': false,

        multiPartBase: 'admin0',
        annotated: true
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo)
      .toEqual([
        {

          name: 'admin1',
          type: 'geo',

          geo_type: 'state/territory',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
        {

          name: 'admin2',
          type: 'geo',

          geo_type: 'county/district',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
        {

          name: 'admin3',
          type: 'geo',

          geo_type: 'municipality/town',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
        {
          name: 'admin0',
          type: 'geo',

          geo_type: 'country',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
      ]);
  });

  test('multi column geo: multiple admin columns with 2 columns selected only', () => {
    const input = {
      'admin0 + admin1': {
        aliases: [],

        category: 'geo',
        display_name: 'SUPER_GGEO',
        description: 'merged geo description from multi admin',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'country',
        primary: true,
        gadm_level: '',
        'geo.coordinate-pair': false,

        'geo.multi-column': true,

        'geo.multi-column.admin0': 'admin0',
        'geo.multi-column.admin1': 'admin1',
        'geo.multi-column.admin2': '',
        'geo.multi-column.admin3': '',

        date_type: '',
        time_format: '',
        'date.multi-column': false,

        multiPartBase: 'admin0',
        annotated: true
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo)
      .toEqual([
        {
          name: 'admin1',
          type: 'geo',

          geo_type: 'state/territory',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
        {
          name: 'admin0',
          type: 'geo',

          geo_type: 'country',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
      ]);
  });

  test('multi column geo: multiple admin columns with only 1 column selected', () => {
    const input = {
      'admin0': {
        aliases: [],

        category: 'geo',
        display_name: 'SUPER_GGEO',
        description: 'merged geo description from multi admin',

        isQualifies: false,
        qualifierrole: 'breakdown',
        qualifies: [],

        geo_type: 'country',
        primary: true,
        gadm_level: '',
        'geo.coordinate-pair': false,

        'geo.multi-column': true,

        'geo.multi-column.admin0': 'admin0',
        'geo.multi-column.admin1': '',
        'geo.multi-column.admin2': '',
        'geo.multi-column.admin3': '',

        date_type: '',
        time_format: '',
        'date.multi-column': false,

        multiPartBase: 'admin0',
        annotated: true
      }
    };

    const output = formatAnnotationsOUT(input);

    expect(output.geo)
      .toEqual([
        {
          name: 'admin0',
          type: 'geo',

          geo_type: 'country',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          primary_geo: true,

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        },
      ]);
  });
});

describe('formatAliasesOUT', () => {
  test('converts array notation to obj', () => {
    expect(formatAliasesOUT([{ current: 'a', new: 'b' }, { current: '1', new: '2' }]))
      .toEqual({
        a: 'b',
        1: '2'
      });
  });
});
