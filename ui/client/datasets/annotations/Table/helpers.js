import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';

/**
 * Returns if event click occurred on left-half or right-half of the screen
 * */
export const calcPointerLocation = (event) => {
  const { left, right } = event.target.getBoundingClientRect();
  const pivot = window.innerWidth / 2;
  const targetCenter = (left + right) / 2;

  return targetCenter > pivot ? 'left' : 'right';
};

/**
 * Returns a unique id for a cell from mui/datagrid. Useful when meaning to trigger
 * actions or style target cells upon certain mui/datagrid events.
 * */
export const getCellId = (cell) => `${cell.id}-${cell.colDef.field}`;

/**
 * Moves annotated columns to the left/top side of table for visibility,
 * as well as groups annotated columns together (which are also annotated!)
 **/
export function groupColumns(columns, multiPartData, annotations={}) {

  if (!isEmpty(columns) && !isEmpty(annotations)) {
    const acc = [];
    const seen = {};

    Object
      .keys(annotations)
      .forEach((annotatedColumnName) => {

        const multiPartEntry = multiPartData[annotatedColumnName];

        if (multiPartEntry) {

          const baseColumnData = columns
                .find((column) => column.field === multiPartEntry.baseColumn);
          acc.push(baseColumnData);
          seen[baseColumnData.field] = true;

          // The rest of the associated columns, without the baseColumn name
          const restColumns = multiPartEntry.members
                .filter((columnName) => columnName !== multiPartEntry.baseColumn);

          // Add each of those associated columns to accumulator
          restColumns.forEach((remainingColumnName) => {
            const colData = columns.find((c) => c.field === remainingColumnName);
            acc.push(colData);
            seen[remainingColumnName] = true;
          });

        } else if (annotations[annotatedColumnName].annotated && !seen[annotatedColumnName]) {
          const baseColumnData = columns.find((column) => column.field === annotatedColumnName);

          if (baseColumnData) {
            // loading between re-renders and no data matches. "Continue"
            acc.push(baseColumnData);
            seen[baseColumnData.field] = true;
          }
        }
      });

    // Any remaining non-grouped data goes after
    columns.forEach((columnData) => {
      if (!seen[columnData.field]) {
        acc.push(columnData);
      }
    });

    return acc;
  }

  return columns;
};
