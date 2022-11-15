/* eslint-disable no-undef */
import { formatAnnotationsIN, formatMultiPartDataIn } from './dataIN';

describe('formatAnnotationsIN', () => {
  test('Given server\'s data shape for 1 feature, returns shape suited for the UI to consume', () => {
    const input = {
      geo: [],
      feature: [{
        name: 'sample-feature',
        type: 'feature',
        display_name: 'display-name2',
        description: 'some desc',
        feature_type: 'float',
        units: 'm',
        units_description: 'mm',

        qualifies: [
          'crop_production',
          'malnutrition_rate'
        ],
        qualifierrole: 'breakdown',

        aliases: {
          0: '1',
          2: '3'
        },
      }],
      date: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'sample-feature': {
          category: 'feature',
          display_name: 'display-name2',
          description: 'some desc',
          feature_type: 'float',
          units: 'm',
          units_description: 'mm',
          isQualifies: true,
          qualifies: ['crop_production', 'malnutrition_rate'],
          qualifierrole: 'breakdown',
          aliases: [{ current: '0', new: '1', id: 1 },
            { current: '2', new: '3', id: 2 }],

          annotated: true
        }
      });
  });

  test('loads server annotation data of gadm_level into field, when present on geo column', () => {

    const input = {
      geo: [{
        name: 'sample-geo',
        type: 'geo',
        display_name: 'display-name3',
        description: 'some desc2',

        geo_type: 'coordinates',
        primary_geo: true,
        resolve_to_gadm: false,

        coord_format: 'lonlat',
        gadm_level: 'admin2',

        aliases: {
          a: 'b'
        },
      }],
      feature: [],
      date: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'sample-geo': {
          category: 'geo',
          display_name: 'display-name3',
          description: 'some desc2',
          aliases: [{ current: 'a', new: 'b', id: 1 }],

          isQualifies: false,
          geo_type: 'coordinates',
          primary: true,
          resolve_to_gadm: false,
          gadm_level: 'admin2',

          coord_format: 'lonlat',
          annotated: true
        }
      });
  });

  test('Formats server\'s data shape for 1 geo (non multi-part) annotation, for the UI to consume', () => {
    const input = {
      geo: [{
        name: 'sample-geo',
        type: 'geo',
        display_name: 'display-name3',
        description: 'some desc2',

        geo_type: 'latitude',
        primary_geo: true,
        resolve_to_gadm: true,

        coord_format: 'lonlat',

        aliases: {
          a: 'b'
        },
      }],
      feature: [],
      date: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'sample-geo': {
          category: 'geo',
          display_name: 'display-name3',
          description: 'some desc2',
          aliases: [{ current: 'a', new: 'b', id: 1 }],

          isQualifies: false,
          geo_type: 'latitude',
          primary: true,
          resolve_to_gadm: true,

          coord_format: 'lonlat',
          annotated: true
        }
      });
  });

  test('Formats server\'s data shape for 1 geo (non multi-part) country annotation, for the UI to consume', () => {
    const input = {
      geo: [{
        name: 'sample-geo',
        type: 'geo',
        display_name: 'display-name3',
        description: 'some desc2',

        geo_type: 'country',
        primary_geo: true,
        resolve_to_gadm: false,

        aliases: {
          a: 'b'
        },
      }],
      feature: [],
      date: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'sample-geo': {
          category: 'geo',
          display_name: 'display-name3',
          description: 'some desc2',
          aliases: [{ current: 'a', new: 'b', id: 1 }],

          isQualifies: false,
          geo_type: 'country',
          primary: true,
          resolve_to_gadm: false,

          annotated: true
        }
      });
  });

  test('Given server\'s data shape for 1 date (non multi-part), returns shape suited for the UI to consume', () => {
    const input = {
      date: [{
        name: 'sample-date',
        type: 'date',
        display_name: 'display-date',
        description: 'some desc for date',

        date_type: 'year',
        primary_date: true,

        time_format: '%y',

        aliases: {
          a: 'b'
        },
      }],
      feature: [],
      geo: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'sample-date': {
          category: 'time',
          display_name: 'display-date',
          description: 'some desc for date',
          aliases: [{ current: 'a', new: 'b', id: 1 }],
          isQualifies: false,
          date_type: 'year',
          primary: true,

          time_format: '%y',
          annotated: true
        }
      });
  });

  test('Given server\'s annotation shape for 2 mp coordinate pair geo columns, returns shape suited for the UI to use', () => {
    const input = {
      geo: [{
        name: 'sample-geo-lat',
        type: 'geo',
        display_name: 'display-name3',
        description: 'some desc2',

        geo_type: 'latitude',
        primary_geo: true,
        resolve_to_gadm: true,

        is_geo_pair: 'sample-geo-lon',

        coord_format: 'lonlat',

        aliases: {
          a: 'b'
        },
      }, {
        name: 'sample-geo-lon',
        type: 'geo',
        display_name: 'display-name3',
        description: 'some desc2',

        geo_type: 'longitude',
        primary_geo: true,
        resolve_to_gadm: true,

        coord_format: 'lonlat',
      }],
      feature: [],
      date: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'sample-geo-lat + sample-geo-lon': {
          category: 'geo',
          display_name: 'display-name3',
          description: 'some desc2',
          aliases: [{ current: 'a', new: 'b', id: 1 }],

          geo_type: 'latitude',

          'geo.coordinate-pair': true,
          'geo.coordinate-pair-column': 'sample-geo-lon',

          isQualifies: false,
          primary: true,
          resolve_to_gadm: true,

          coord_format: 'lonlat',

          annotated: true,
          multiPartBase: 'sample-geo-lat'
        }
      });
  });

  test('Given server\'s annotation shape for multi-part date columns, returns shape suited for the UI to use', () => {
    const input = {
      date: [{
        name: 'date-year',
        type: 'date',
        date_type: 'year',
        display_name: '',
        description: 'A description for multipart field',

        time_format: '%y',

        associated_columns: {
          Month: 'date-month',
          Day: 'date-day'
        },

        primary_date: true,

      }, {
        name: 'date-month',
        type: 'date',
        display_name: '',
        date_type: 'month',
        time_format: '%m',

        description: 'A description for multipart field',
        primary_date: true,

      }, {
        name: 'date-day',
        type: 'date',
        date_type: 'day',
        time_format: '%d',

        display_name: '',
        description: 'A description for multipart field',
        primary_date: true,
      }],
      feature: [],
      geo: []
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'date-year + date-month + date-day': {

          category: 'time',

          display_name: '',
          description: 'A description for multipart field',

          date_type: 'year',
          primary: true,

          time_format: '%y',
          isQualifies: false,

          'date.multi-column': true,
          'date.multi-column.day': 'date-day',
          'date.multi-column.month': 'date-month',
          'date.multi-column.year': 'date-year',

          'date.multi-column.year.format': '%y',
          'date.multi-column.month.format': '%m',
          'date.multi-column.day.format': '%d',


          annotated: true,
          multiPartBase: 'date-year'
        }
      });
  });

  test('Given server\'s annotation shape for multi-part geo columns, returns shape suited for the UI to use', () => {
    const input = {
      geo: [
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
        }
      ]
    };

    const output = formatAnnotationsIN(input);

    expect(output.annotations)
      .toEqual({
        'admin1 + admin2 + admin3 + admin0': {
          aliases: [],

          category: 'geo',
          display_name: 'SUPER_GGEO',
          description: 'merged geo description from multi admin',

          isQualifies: false,
          qualifierrole: 'breakdown',
          qualifies: [],

          geo_type: 'state/territory',
          primary: true,

          'geo.multi-column': true,

          'geo.multi-column.admin0': 'admin0',
          'geo.multi-column.admin1': 'admin1',
          'geo.multi-column.admin2': 'admin2',
          'geo.multi-column.admin3': 'admin3',

          multiPartBase: 'admin1',
          annotated: true
        }
      });
  });


  test('Given server\'s annotation shape for multiple non-primary geo columns, loads annotations as separate', () => {
    // Sanity check that non-primary geos won't load as multi-part admin geos (build a geo)
    const input = {
      geo: [
        {
          name: 'admin1',
          type: 'geo',

          geo_type: 'state/territory',

          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',

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

          aliases: {},
          qualifies: [],
          qualifierrole: 'breakdown',
        }
      ]
    };

    const output = formatAnnotationsIN(input);

    // 4 individual annotations, as expected.. since these 4 admin geos weren't marked a primary
    expect(output.annotations)
      .toEqual({
        admin1: {
          geo_type: 'state/territory',
          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          aliases: [],
          qualifies: [],
          qualifierrole: 'breakdown',
          category: 'geo',
          isQualifies: false,
          annotated: true
        },
        admin2: {
          geo_type: 'county/district',
          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          aliases: [],
          qualifies: [],
          qualifierrole: 'breakdown',
          category: 'geo',
          isQualifies: false,
          annotated: true
        },
        admin3: {
          geo_type: 'municipality/town',
          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          aliases: [],
          qualifies: [],
          qualifierrole: 'breakdown',
          category: 'geo',
          isQualifies: false,
          annotated: true
        },
        admin0: {
          geo_type: 'country',
          description: 'merged geo description from multi admin',
          display_name: 'SUPER_GGEO',
          aliases: [],
          qualifies: [],
          qualifierrole: 'breakdown',
          category: 'geo',
          isQualifies: false,
          annotated: true,
        }
      });
  });
});

describe('formatMultiPartDataIn', () => {
  test('formats Date/time multi-part data as the UI would expect it', () => {
    const input = {
      'date-year + date-month + date-day': ['date-month', 'date-day'],
      'latitude + longitude': ['longitude']
    };
    const output = formatMultiPartDataIn(input);

    expect(output).toEqual({
      'date-year + date-month + date-day': {
        members: ['date-year', 'date-month', 'date-day'],
        name: 'date-year + date-month + date-day',
        baseColumn: 'date-year',
        category: 'time'
      },
      'latitude + longitude': {
        members: ['latitude', 'longitude'],
        name: 'latitude + longitude',
        baseColumn: 'latitude',
        category: 'geo'
      }
    });
  });
});
