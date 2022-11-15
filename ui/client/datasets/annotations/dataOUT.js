import forEach from 'lodash/forEach';
import map from 'lodash/map';
import isEmpty from 'lodash/isEmpty';
import mapKeys from 'lodash/mapKeys';
import pick from 'lodash/pick';
import difference from 'lodash/difference';
import head from 'lodash/head';
import capitalize from 'lodash/capitalize';

// Properties used when formatting annotations out
const properties = {
  common: ['aliases', 'category', 'description', 'display_name', 'qualifies', 'qualifierrole'],
  feature: ['feature_type', 'units_description', 'units'],
  geo: ['geo_type', 'resolve_to_gadm', 'coord_format'],
  time: ['date_type', 'time_format']
};

const mapKeysToBackend = {
  category: 'type',
};

/**
 * Returns associated date columns to send OUT to backend.
 * */
function prepareDateMultiPartAnnotations(annotation) {
  return [
    'date.multi-column.day',
    'date.multi-column.month',
    'date.multi-column.year'
  ].reduce((acc, current) => {
    const { multiPartBase } = annotation;
    const currVisitedColumn = annotation[current];

    // Skip adding base column to associated columns
    if (currVisitedColumn !== multiPartBase) {
      const part = capitalize(current.replace('date.multi-column.', ''));
      acc[part] = currVisitedColumn;
    }

    return acc;
  }, {});
}

/**
 * Used for multi-part geo, (Not coordinate pairs) to retrieve all associated columns
 * Multi-part Base: the base column that contains the annotations for the rest of multi part members
 * Milti-part Member: Any other column in the multipart relationship,
*   which isnt the Multi-Part Base.
 * */
function getGeoMultiPartMembers(annotation) {
  return ['admin0', 'admin1', 'admin2', 'admin3']
    .map((admin) => annotation[`geo.multi-column.${admin}`])
    .filter((columnName) => columnName !== annotation.multiPartBase);
}

/**
 *
 * */
export function formatAliasesOUT(aliasesArray) {
  return aliasesArray.reduce((acc, curr) => {
    acc[curr.current] = curr.new;
    return acc;
  }, {});
}

const geoMultiPartKeyAdminMapOUT = {
  'geo.multi-column.admin0': 'country',
  'geo.multi-column.admin1': 'state/territory',
  'geo.multi-column.admin2': 'county/district',
  'geo.multi-column.admin3': 'municipality/town'
};

// Helper for formatAnnotationsOUT to set up additional multi-column multi-part date annotation
function genDateMultiPartMemberAnnotation(annotation, data) {
  // Expecting object keys order is incorrect for purposes of unit tests.
  // Look into either a) refactoring b) eliminating tests c) praying
  return map(data.associated_columns, (associatedColumnName, associatedColumnType) => {
    const additionalColumnEntry = { ...data };

    additionalColumnEntry.name = associatedColumnName;
    additionalColumnEntry.date_type = associatedColumnType.toLowerCase();

    additionalColumnEntry.time_format = annotation[`date.multi-column.${additionalColumnEntry.date_type}.format`];

    delete additionalColumnEntry.associated_columns;

    return additionalColumnEntry;
  });
}

// Helper for formatAnnotationsOUT to set up additional multi-column multi-part geo annotation
function genGeoMultiPartMemberAnnotation(multiPartMembers, annotation, data) {
  return map(multiPartMembers, (multiPartMember) => {
    const additionalColumnEntry = { ...data };
    additionalColumnEntry.name = multiPartMember;

    const relationshipKey = ['admin0', 'admin1', 'admin2', 'admin3']
      .find((i) => annotation[`geo.multi-column.${i}`] === additionalColumnEntry.name);

    additionalColumnEntry.geo_type = geoMultiPartKeyAdminMapOUT[`geo.multi-column.${relationshipKey}`];

    return additionalColumnEntry;
  });
}

/**
 *
 * */
function formatDateAnnotationOUT(localAnnotation, outgoingAnnotationBase) {
  const collectedOutgoingAnnotations = [];
  const outgoingAnnotation = { ...outgoingAnnotationBase };

  outgoingAnnotation.primary_date = localAnnotation.primary;

  // NOTE inconsistencies between 'time' and 'date' on backend endpoints
  outgoingAnnotation.type = 'date';

  if (localAnnotation.multiPartBase) {
    outgoingAnnotation.name = localAnnotation.multiPartBase;
    outgoingAnnotation.associated_columns = prepareDateMultiPartAnnotations(localAnnotation);

    genDateMultiPartMemberAnnotation(localAnnotation, outgoingAnnotation)
      .forEach((item) => { collectedOutgoingAnnotations.push(item); });
  }
  collectedOutgoingAnnotations.push(outgoingAnnotation);

  return collectedOutgoingAnnotations;
}

/**
 *
 * */
function formatGeoAnnotationOUT(localAnnotation, outgoingAnnotationBase) {
  const collectedOutgoingAnnotations = [];
  const outgoingAnnotation = { ...outgoingAnnotationBase };

  outgoingAnnotation.primary_geo = localAnnotation.primary;

  const isCoordinatePair = Boolean(localAnnotation['geo.coordinate-pair'] && localAnnotation['geo.coordinate-pair-column']);

  if (localAnnotation.primary && ((localAnnotation.geo_type === 'coordinates') || isCoordinatePair)) {
    outgoingAnnotation.gadm_level = localAnnotation.gadm_level;
  }

  if (localAnnotation.multiPartBase) {
    outgoingAnnotation.name = localAnnotation.multiPartBase;

    // multi-admin geos (made from country, state, county, town etc):
    if (localAnnotation['geo.multi-column']) {
      const otherColumnNames = getGeoMultiPartMembers(localAnnotation)
      // Filter out unselected build-geo columns; eg empty, no columns selected
            .filter(Boolean);

      genGeoMultiPartMemberAnnotation(otherColumnNames, localAnnotation, outgoingAnnotation)
        .forEach((item) => { collectedOutgoingAnnotations.push(item); });

      // lat,lon or lon,lat coordinate pair (2 associated geo columns):
    } else if (isCoordinatePair) {
      outgoingAnnotation.is_geo_pair = localAnnotation['geo.coordinate-pair-column'];

      const coordinatePairData = { ...outgoingAnnotation };
      coordinatePairData.name = localAnnotation['geo.coordinate-pair-column'];
      coordinatePairData.geo_type = head(
        difference(['longitude', 'latitude'], [outgoingAnnotation.geo_type])
      );
      delete coordinatePairData.is_geo_pair;

      collectedOutgoingAnnotations.push(coordinatePairData);
    }
  }

  collectedOutgoingAnnotations.push(outgoingAnnotation);

  return collectedOutgoingAnnotations;
}

/**
 *
 * */
export function formatAnnotationsOUT(annotations) {
  const features = [];
  const geos = [];
  const dates = [];

  forEach(annotations, (annotateObject, columnName) => {
    if (!isEmpty(annotateObject)) {
      const type = annotateObject.category;
      const sanitized = pick(annotateObject, [...properties.common, ...properties[type]]);
      const renamed = mapKeys(sanitized, (value, key) => mapKeysToBackend[key] || key);

      renamed.name = columnName;
      renamed.aliases = formatAliasesOUT(annotateObject.aliases);

      if (!annotateObject.isQualifies) {
        renamed.qualifies = [];
      }

      if (type === 'time') {
        formatDateAnnotationOUT(annotateObject, renamed)
          .forEach((i) => dates.push(i));
      } else if (type === 'geo') {
        formatGeoAnnotationOUT(annotateObject, renamed)
          .forEach((i) => geos.push(i));
      } else if (type === 'feature') {
        features.push(renamed);
      }
    }
  });

  const formatted = {
    feature: features,
    geo: geos,
    date: dates
  };

  return formatted;
}
