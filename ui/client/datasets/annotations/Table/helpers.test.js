/* eslint-disable no-undef */
import { groupColumns } from './helpers';

describe('groupColumns', () => {
  test('Given columns and empty annotation data, returns columns unmodified', () => {
    const columns = [{ field: 'col1' }, { field: 'col2' }];

    expect(groupColumns(columns)).toEqual(columns);
  });

  test('Given annotations with multiPartData that group two columns together, groups those (reorder) within column data', () => {
    const columns = [{ field: 'col1' }, { field: 'col2' }, { field: 'col3' }, { field: 'col4' }];

    const annotations = {
      'col2 + col4': {
        annotated: true,
        description: 'sample'
      }
    };

    const multiPartData = {
      'col2 + col4': {
        baseColumn: 'col2',
        members: ['col2', 'col4'],
        name: 'col2 + col4',
        category: 'geo'
      }
    };

    expect(groupColumns(columns, multiPartData, annotations))
      .toEqual([
        { field: 'col2' },
        { field: 'col4' },
        { field: 'col1' },
        { field: 'col3' },
      ]);
  });

  test('Given multiPartData that group two columns together but in reverse order, groups those (reorder) within column data', () => {
    const columns = [{ field: 'col1' }, { field: 'col2' }, { field: 'col3' }, { field: 'col4' }];

    const multiPartData = {
      'col2 + col4': {
        baseColumn: 'col2',
        members: ['col4', 'col2'],
        name: 'col2 + col4',
        category: 'geo'
      }
    };

    const annotations = {
      'col2 + col4': {
        annotated: true,
        description: 'sample'
      }
    };

    expect(groupColumns(columns, multiPartData, annotations))
      .toEqual([
        { field: 'col2' },
        { field: 'col4' },
        { field: 'col1' },
        { field: 'col3' },
      ]);
  });

  test('Given multiPartData that group two columns together but in reverse order, groups those (reorder) within column data', () => {
    const columns = [{ field: 'col1' }, { field: 'col2' }, { field: 'col3' }, { field: 'col4' }];

    const multiPartData = {
      'col4 + col1': {
        baseColumn: 'col4',
        members: ['col4', 'col1'],
        name: 'col4 + col1',
        category: 'geo'
      }
    };

    const annotations = {
      'col4 + col1': {
        annotated: true,
        description: 'sample'
      }
    };

    expect(groupColumns(columns, multiPartData, annotations))
      .toEqual([
        { field: 'col4' },
        { field: 'col1' },
        { field: 'col2' },
        { field: 'col3' },
      ]);
  });

  test('No multipart data, but some annotations, reorganizes columns so that annotated columns show first', () => {
    const columns = [{ field: 'col1' }, { field: 'col2' }, { field: 'col3' }, { field: 'col4' }];

    const multiPartData = {
    };

    const annotations = {
      'col3': {
        display_name: 'hi',
        description: 'required',
        annotated: true
      }
    };

    expect(groupColumns(columns, multiPartData, annotations))
      .toEqual([
        { field: 'col3' },
        { field: 'col1' },
        { field: 'col2' },
        { field: 'col4' },
      ]);
  });

});
