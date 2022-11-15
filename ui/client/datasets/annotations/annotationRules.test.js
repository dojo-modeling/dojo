/* eslint-disable no-undef */
import { previousPrimaryColumn, verifyQualifierPrimaryRules } from './annotationRules';

describe('verifyQualifierPrimaryRules', () => {
  test('Cant qualify other qualifier columns', () => {
    const currentColumnValues = {
      isQualifies: true,
      qualifies: ['longitude', 'other']
    };

    const allColumnValues = {
      longitude: {
        isQualifies: true
      },
      other: {
        isQualifies: true
      },
      andAnother: {
        isQualifies: false
      }
    };

    const result = verifyQualifierPrimaryRules(currentColumnValues, allColumnValues);

    expect(result).toEqual({ isQualifies: ["Cannot qualify qualifier column(s): 'longitude', 'other'."] });
  });

  test('Can\'t qualify primary columns', () => {
    const currentColumnValues = {
      isQualifies: true,
      qualifies: ['latitude', 'other']
    };

    const allColumnValues = {
      latitude: {
        primary: true
      },
      other: {
      },
      andAnother: {
      }
    };

    const result = verifyQualifierPrimaryRules(currentColumnValues, allColumnValues);

    expect(result)
      .toEqual({ isQualifies: ["Cannot qualify primary column(s): 'latitude'."] });
  });

  test('Can\'t specificy qualifies checkbox without selecting columns to qualify', () => {
    const currentColumnValues = {
      isQualifies: true,
      qualifies: []
    };

    const allColumnValues = {};

    const result = verifyQualifierPrimaryRules(currentColumnValues, allColumnValues);

    expect(result)
      .toEqual({ isQualifies: ['Please select at least one column to qualify.'] });
  });

  test('Can\'t mark a primary column as a qualifier', () => {
    const currentColumnValues = {
      isQualifies: true,
      primary: true,
      qualifies: ['some-such']
    };

    const allColumnValues = {};

    const result = verifyQualifierPrimaryRules(currentColumnValues, allColumnValues);

    expect(result)
      .toEqual({ primary: ['A primary column cannot be marked as a qualifier.'] });
  });
});

describe('previousPrimaryColumn', () => {
  test('correctly finds an existing primary column and returns its columnFieldName', () => {
    const allAnnotations = {
      anotherColumnField: {
        category: 'jabberwocky',
        primary: true
      }
    };

    const editingValues = {
      category: 'jabberwocky',
      primary: true
    };

    const editingColumnName = 'value';

    const result = previousPrimaryColumn(allAnnotations, editingValues, editingColumnName);

    expect(result).toBe('anotherColumnField');
  });

  test('if it finds an existing primary column but its the same editing column, does not return a match', () => {
    const allAnnotations = {
      value: {
        category: 'DiddleDiddle',
        primary: true
      }
    };

    const editingValues = {
      category: 'DiddleDiddle',
      primary: true
    };

    const editingColumnName = 'value';

    const result = previousPrimaryColumn(allAnnotations, editingValues, editingColumnName);

    expect(result).toBeNull();
  });

  test('no previous primary with same category found', () => {
    const allAnnotations = {
      AnotherColumnField: {
        category: 'Panjadrum',
        primary: true
      }
    };

    const editingValues = {
      category: 'Geraniums',
      primary: true
    };

    const editingColumnName = 'value';

    const result = previousPrimaryColumn(allAnnotations, editingValues, editingColumnName);

    expect(result).toBeNull();
  });
});
