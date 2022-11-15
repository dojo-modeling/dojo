import get from 'lodash/get';
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import capitalize from 'lodash/capitalize';
import { CATEGORIES } from './constants';

/**
 * TODO remove its multipart associated columns as well.
 * Or, if already multipart, remove its members as well.
 * First verify if this is a desired feature ^
 * */
export const removeSelf = (columns, editingColumnName) => columns
  .filter((column) => column.field !== editingColumnName);

/**
 * Removes values for controls not displayed (per toggles) that would cause
 * irrelevant validation errors.
 * TBD , will probably need to do more data cleanups here
 * */
export function cleanUnusedFields(values) {
  return {
    ...values,
    primary: (values.category === CATEGORIES.feature) ? false : values.primary
  };
}

/**
 *
 * */
export function previousPrimaryColumn(allAnnotations, editingValues, editingColumnName) {
  const { category: editingCategory, primary: isEditingPrimary } = editingValues;

  let existingPrimaryColumn = null;

  if (isEditingPrimary) {
    // If there are other primary fields of the same category,
    // we'll return the [last] offending field name (UI should at most allow for 1)
    forEach(
      allAnnotations,
      ({ category: existingFieldCategory, primary: existingPrimary }, columnName) => {
        const notCurrentColumn = columnName !== editingColumnName;
        const isSameCategory = editingCategory === existingFieldCategory;

        if (notCurrentColumn && isSameCategory && existingPrimary) {
          existingPrimaryColumn = columnName;
        }
      }
    );
  }

  return existingPrimaryColumn;
}

/**
 *
 * */
function addError(errors, fieldName, message) {
  /* eslint-disable no-param-reassign */
  if (errors[fieldName]) {
    errors[fieldName].push(` ${message}`);
  } else {
    errors[fieldName] = [message];
  }
  /* eslint-enable no-param-reassign */
}

/**
 * errors return shape:
 * {
 *   <field-name>: ['message', 'another optional message']
 * }
 * Example:
 * {
 *   email: ['Required'],
 *   password: ['Minimum 8 characters']
 * }
 * */
export const verifyQualifierPrimaryRules = (currentValues, allAnnotations, editingColumnName) => {
  const errors = {};

  const isPrimary = currentValues.primary;
  const isFeature = currentValues.category === CATEGORIES.feature;

  // [BR-D8] The primary date cannot be marked as a qualifier
  // [BR-G8] The primary geography cannot be marked as a qualifier
  if (!isFeature && isPrimary && currentValues.isQualifies) {
    addError(errors, 'primary', 'A primary column cannot be marked as a qualifier.');
  }

  if (currentValues.isQualifies && isEmpty(currentValues.qualifies)) {
    addError(errors, 'isQualifies', 'Please select at least one column to qualify.');
  }

  // [BR-D5-G7] There can be only one primary date.
  //   This might consist of 2+ columns in the case of a multipart date.
  // [BR-D6-G8] If a user has already marked a date as primary, then tries to mark some
  // other date as primary, we should change the primary date to the new feature, but alert the user
  const previousPrimary = previousPrimaryColumn(allAnnotations, currentValues, editingColumnName);
  if (previousPrimary) {
    addError(errors, 'primary', `'${previousPrimary}' has already been selected as the primary ${capitalize(currentValues.category)} column. Remove the previous primary column selection before adding a new one.`);
  }

  if (currentValues.isQualifies) {
    // [BR-O2] Qualifiers cannot qualify other qualifiers
    const qualifiesQualifiers = [];

    // [BR-D9G9] Qualifiers cannot qualify primary date, geo fields
    const qualifiesPrimary = [];

    currentValues.qualifies
      .forEach((qualifiedColumn) => {
        const qualifiesAnotherField = get(allAnnotations, [qualifiedColumn, 'isQualifies'], false);

        if (qualifiesAnotherField) {
          qualifiesQualifiers.push(qualifiedColumn);
        }

        const qualifiedIsPrimary = get(allAnnotations, [qualifiedColumn, 'primary'], false);

        if (qualifiedIsPrimary) {
          qualifiesPrimary.push(qualifiedColumn);
        }
      });

    if (!isEmpty(qualifiesQualifiers)) {
      const formatted = qualifiesQualifiers.map((v) => `'${v}'`).join(', ');
      addError(errors, 'isQualifies', `Cannot qualify qualifier column(s): ${formatted}.`);
    }

    if (!isEmpty(qualifiesPrimary)) {
      const formatted = qualifiesPrimary.map((v) => `'${v}'`).join(', ');
      addError(errors, 'isQualifies', `Cannot qualify primary column(s): ${formatted}.`);
    }
  }

  return errors;
};

/**
 * Identify required fields and default overrides.
 * */
export function validateRequirements(allAnnotations) {
  const errors = [];
  const warnings = [];

  const foundFeature = find(
    allAnnotations,
    (annotation) => annotation.category === CATEGORIES.feature
  );
  const foundPrimaryDate = find(
    allAnnotations,
    (annotation) => annotation.category === CATEGORIES.time && annotation.primary
  );

  if (!foundFeature) {
    errors.push('At least one column must be annotated as a feature.');
  }
  if (!foundPrimaryDate) {
    warnings.push('No primary date annotated. All data will default to current date.');
  }
  return { errors, warnings };
}

/**
 *
 * */
export function verifyConditionalRequiredFields(annotation) {
  const errors = {};

  if (annotation['date.multi-column']) {
    ['date.multi-column.day',
      'date.multi-column.month',
      'date.multi-column.year',

      'date.multi-column.year.format',
      'date.multi-column.month.format',
      'date.multi-column.day.format'].forEach((valName) => {
      if (!annotation[valName]) {
        errors[valName] = 'Required';
      }
    });
  }

  // TODO which fields are required on multi-column-admin geos?

  if (annotation.category === CATEGORIES.time) {
    if (!annotation.time_format && !annotation['date.multi-column']) {
      errors.time_format = 'Required';
    }
  }

  if (annotation.category === CATEGORIES.feature) {
    if (!annotation.units) {
      errors.units = 'Required';
    }
  }

  return errors;
}
