import map from 'lodash/map';
import isEmpty from 'lodash/isEmpty';
import difference from 'lodash/difference';
import head from 'lodash/head';
import values from 'lodash/values';
import mapValues from 'lodash/mapValues';

import { CATEGORIES, GEO_ADMINS } from './constants';

/**
 *
 * */
export function formatAliasesIn(aliasesObj) {
  if (!aliasesObj) {
    return undefined;
  }

  const acc = [];

  let idx = 1;
  for (const [curr, replacement] of Object.entries(aliasesObj)) {
    acc.push({
      current: curr,
      new: replacement,
      id: idx++
    });
  }

  return acc;
}

function dataInHelper(objIn) {
  const data = {
    ...objIn,
    category: objIn.type.replace('date', CATEGORIES.time),
    primary: objIn.primary_geo || objIn.primary_date,
    type: undefined,
    primary_geo: undefined,
    primary_date: undefined,
    name: undefined,
    isQualifies: !isEmpty(objIn.qualifies),
    annotated: true,
  };

  data.aliases = formatAliasesIn(objIn.aliases);

  return data;
}

const geoMultiPartKeyAdminMapIN = {
  country: 'geo.multi-column.admin0',
  'state/territory': 'geo.multi-column.admin1',
  'county/district': 'geo.multi-column.admin2',
  'municipality/town': 'geo.multi-column.admin3'
};

/**
 * Formats an individual annotation obj for client/UI
 * */
function formatAnnotationIn(obj) {
  let { name } = obj;
  const { associated_columns } = obj;

  const multiPartData = {};
  const data = dataInHelper(obj);

  // Big Multi-part logic:

  if (obj.type === 'date' && associated_columns) {
    name = [name, ...values(associated_columns)].join(' + ');

    multiPartData[name] = [];

    data.multiPartBase = obj.name;

    Object.keys(associated_columns)
      .forEach((dateType) => {
        const colName = associated_columns[dateType];
        multiPartData[name].push(colName);
        data[`date.multi-column.${dateType.toLowerCase()}`] = colName;
      });

    data[`date.multi-column.${obj.date_type}`] = obj.name;
    data[`date.multi-column.${obj.date_type}.format`] = obj.time_format;
    data['date.multi-column'] = true;

    delete data.associated_columns;
  } else if (obj.type === 'geo' ) {
    data.gadm_level = obj.gadm_level;

    if (obj.is_geo_pair) {
      data['geo.coordinate-pair'] = true;
      data['geo.coordinate-pair-column'] = obj.is_geo_pair;

      name += ` + ${obj.is_geo_pair}`;
      multiPartData[name] = [obj.is_geo_pair];

      data.multiPartBase = obj.name;

      delete data.is_geo_pair;
    }
  }

  return { name, data, multiPartData };
}

/**
 * Extends simple multiPartData derived from backend data, adding info for the UI to consume
 * */
export function formatMultiPartDataIn(derivedData) {
  // values are the rest of the columns in the multipart relationship (other than base)
  return mapValues(derivedData, (value, key) => {

    const baseColumn = head(
      difference(key.split(' + '), value)
    );

    return {
      name: key,
      members: [baseColumn, ...value],
      baseColumn,
      // Coord pairs have only one non-base member column, while time/date have 2
      // This does not account/work with non-pair multi-part geo data,
      // which is handled formatMultiPartGeoIn
      category: value.length === 1 ? 'geo' : 'time'
    };
  });
}

/**
 * Multi-part admin geos are also known as "Build a Geo" (from country/state/county/town combo)
 **/
function formatMultiPartGeoIn(multiPartGeoColumns, loadedMultiGeoAnnotation) {
  // First item found within this group will be assigned multiPartBase role
  const firstMultiPartAnnotationCandidate = loadedMultiGeoAnnotation[multiPartGeoColumns[0]];

  const name = multiPartGeoColumns.join(' + ');
  const multiPartGeoAnnotation = dataInHelper({ ...firstMultiPartAnnotationCandidate });
  multiPartGeoAnnotation.primary = true;
  multiPartGeoAnnotation['geo.multi-column'] = true;
  const [firstColumn] = multiPartGeoColumns;

  map(loadedMultiGeoAnnotation, (val) => {
    const attr = geoMultiPartKeyAdminMapIN[val.geo_type];
    multiPartGeoAnnotation[attr] = val.name;
  });

  multiPartGeoAnnotation.multiPartBase = firstColumn;

  delete multiPartGeoAnnotation.gadm_level;

  const multiPartData = {
    name,
    members: multiPartGeoColumns,
    baseColumn: firstColumn,
    category: 'geo'
  };

  return { name, multiPartGeoAnnotation, multiPartData };
}

/**
 * Receives server annotations as categorized arrays:
 *    {annotations: {geo: [{sampleColumn1}], feature: [{sampleColumn2}], date: []}}
 * and returns an object with keys of column names and values of annotations for that column:
 *    {sampleColumn: {...annotations}, sampleColumn2: {...annotations}}
 * */
export function formatAnnotationsIN(serverAnnotations) {
  const { geo = [], date = [], feature = [] } = serverAnnotations;

  const loadedMultiPartAdminGeoAnnotations = {};

  // Find all columns annotated as admin regions AND primary
  // This indicates a multi-part geo annotation (backend doesn't state so explicitly)
  const multiPartAdminGeoColumns = geo.reduce((acc, curr) => {
    if (curr.primary_geo && values(GEO_ADMINS).includes(curr.geo_type)) {
      loadedMultiPartAdminGeoAnnotations[curr.name] = curr;
      return [...acc, curr.name];
    }
    return acc;
  }, []);

  const acc = {}; // Accumulator that stores all annotations to return
  const multiPartData = {};
  const multiAdminGeoPartData = {}; // Special case (implicit) to explicit multi-part relationships

  // Don't work with multi-part admin geos the same as the rest:
  const targetGeo = multiPartAdminGeoColumns.length > 1
    ? geo.filter((g) => !multiPartAdminGeoColumns.includes(g.name))
    : geo;

  // Merge all annotations without geo/date/feature top-level categorization
  const ungroupedData = [...targetGeo, ...date, ...feature];

  ungroupedData
    .map(formatAnnotationIn)
    .forEach((annotation) => {
      acc[annotation.name] = annotation.data;
      // Mutates in place:
      Object.assign(multiPartData, annotation.multiPartData);
    });

  if (multiPartAdminGeoColumns.length > 1) {
    const {
      name: multiGeoName,
      multiPartGeoAnnotation,
      multiPartData: geoMultiPartData
    } = formatMultiPartGeoIn(multiPartAdminGeoColumns, loadedMultiPartAdminGeoAnnotations);

    multiAdminGeoPartData[multiGeoName] = geoMultiPartData;
    acc[multiGeoName] = multiPartGeoAnnotation;
  }

  // Inspect date multi-part data and collect dependent Date members format
  for (const [multiPartName, members] of Object.entries(multiPartData)) {
    if (acc[multiPartName]['date.multi-column']) {
      members.forEach((member) => {
        const data = acc[member];
        acc[multiPartName][`date.multi-column.${data.date_type}.format`] = data.time_format;
      });
    }
  }
  // Delete individual multi-part members, since we'll only use the on virtual multi-part
  // annotation for purposes of UI
  for (const [_, members] of Object.entries(multiPartData)) {
    members.forEach((member) => {
      delete acc[member];
    });
  }

  return {
    annotations: acc,
    // Spread object handles multipart dates and coordinate pairs,
    // second part handles multipart geos (which are handled differently by backend and UI)
    multiPartData: { ...formatMultiPartDataIn(multiPartData), ...multiAdminGeoPartData }
  };
}
