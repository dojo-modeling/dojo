import React, { useRef, useState } from 'react';

import clsx from 'clsx';
import get from 'lodash/get';
import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';

import { DataGrid } from '@material-ui/data-grid';
import { withStyles } from '@material-ui/core/styles';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Tooltip from '@material-ui/core/Tooltip';

import ColumnPanel from '../ColumnPanel';

import { calcPointerLocation, groupColumns } from './helpers';
import Header from './Header';

const rowsPerPageOptions = [25, 50, 100];

/**
 *
 * */
const Cell = withStyles(({ palette, spacing }) => ({
  root: {
    marginLeft: -6,
    width: '115%',
    marginRight: -6,
    // NOTE How much to space cell content left. We can also use flex + center items
    paddingLeft: spacing(2)
  },
  hoveredCell: {
    backgroundColor: palette.grey[50],
    cursor: 'pointer',
  },
  // NOTE these Cell styles are in case we wish to explore highlighting all cells within the columns
  // as anotated, similar to spacetag.
  // annotated: {
  //   backgroundColor: '#23b26b33'
  // },
  // requiresAction: {
  //   backgroundColor: '#33728833'
  // }
}))(({
  isHighlighted, classes, value
}) => (
  <span
    className={clsx({
      [classes.root]: true,
      [classes.hoveredCell]: isHighlighted,
      /* [classes.requiresAction]: requiresAction, */
      /* [classes.annotated]: isAnnotated, */
    })}
  >
    {value}
  </span>
));

const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 80;

// TODO add Show Inferred button
// TODO add show Stats button
// TODO change Instructions once colors finalized

/**
 *
 * */
export default withStyles(({ palette }) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  grid: {
    flex: '1 0 30rem',
    maxHeight: `${(ROW_HEIGHT * 15) + HEADER_HEIGHT + 10}px`,
  },
  row: {
    backgroundColor: `${palette.common.white} !important`
  },
  disabledEvents: {
    pointerEvents: 'none'
  },
  columnHeaderTitle: {
    padding: '0 4px !important'
  },
  gridScroll: {
    '& *::-webkit-scrollbar': {
      width: 10,
      height: 10
    },
    // TODO add/use color values to theme
    '& *::-webkit-scrollbar-track': {
      backgroundColor: '#DDDDDD33'
    },
    '& *::-webkit-scrollbar-thumb': {
      backgroundColor: '#CCCCCC',
      borderRadius: 8
    }
  },
  tooltip: {
    fontSize: '1rem'
  },
  hideRightSeparator: {
    '& > .MuiDataGrid-columnSeparator': {
      visibility: 'hidden',
    },
  },
}), { name: 'TableAnnotation' })(({
  classes, annotateColumns, rows,
  columns, annotations, inferredData,
  loading, multiPartData, setMultiPartData,
  validateDateFormat, columnStats,
  fieldsConfig, addingAnnotationsAllowed
}) => {
  const [pageSize, setPageSize] = useState(rowsPerPageOptions[0]);
  const [highlightedColumn, setHighlightedColumn] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [anchorPosition, setAnchorPosition] = useState('right');

  const [isShowMarkers, setShowMarkers] = useState(true);

  const isEditing = Boolean(editingColumn);

  const toggleDrawer = () => {
    setEditingColumn(!editingColumn);
  };

  const findMultipartMember = (columnFieldName) => (
    find(multiPartData, (mp) => mp.members.includes(columnFieldName))
  );

  const handleCellClick = (cell) => {

    const isColumnAnnotated = !isEmpty(annotations[cell.field]);

    if (!isColumnAnnotated && !addingAnnotationsAllowed) {
      return;
    }

    // NOTE removed opening panel on different screen areas
    //      due to UX + having a statistics tab always on left side.
    //      We can add/revisit if we'd like. Else remove all this comment if
    //      it ages badly.
    // setAnchorPosition(calcPointerLocation(event));

    const multiPartMember = find(
      multiPartData, (item) => item && item.members.includes(cell.field)
    );

    if (multiPartMember) {
      const { name } = multiPartMember;
      setEditingColumn({
        name,
        headerName: name
      });
    } else {
      setEditingColumn({
        name: cell.field,
        headerName: cell.colDef?.headerName
      });
    }
  };

  const handleCellOver = (cell) => {
    setHighlightedColumn(cell.field);
  };

  function calcColumnAttrs(columnFieldName) {
    const mpData = findMultipartMember(columnFieldName);
    const isMultiPartBase = get(mpData, 'baseColumn') === columnFieldName;
    const isMultiPartMember = Boolean(mpData);

    const isHighlighted = isMultiPartMember ? mpData.members.includes(highlightedColumn)
      : highlightedColumn === columnFieldName;

    const targetColumn = isMultiPartMember ? mpData.name : columnFieldName;
    const columnAnnotation = annotations[targetColumn];

    let status = 'default';

    if (get(inferredData, `${columnFieldName}.category`)) {
      status = 'inferred';
    }
    if (columnAnnotation) {
      status = 'annotated';
    }
    if (get(columnAnnotation, 'primary')) {
      status = 'primary';
    }

    return {
      isHighlighted,
      status,
      isMultiPartMember,
      isMultiPartBase,
      colSpan: mpData?.members?.length,
      category: columnAnnotation?.category,
      qualifies: columnAnnotation?.isQualifies,
    };
  }

  const sortedColumns = groupColumns(columns, multiPartData, annotations);

  const formattedColumns = sortedColumns
    .map((column) => ({
      ...column,

      flex: 1,
      minWidth: 200,
      sortable: false,
      disableReorder: true,
      // add this class to hide the vertical separators between the headers
      // we'll add it manually in the Header itself so that we can handle multiparts
      headerClassName: classes.hideRightSeparator,

      headerName: column.field,

      renderHeader: ({ colDef }) => (
        <Header
          addingAnnotationsAllowed={addingAnnotationsAllowed}
          showMarkers={isShowMarkers}
          {...calcColumnAttrs(colDef.field)}
          heading={colDef.headerName}
        />
      ),

      renderCell: ({ colDef, value }) => (
        <Cell
          {...calcColumnAttrs(colDef.field)}
          value={value}
        />
      )
    }));

  const gridRef = useRef(null);

  function onAnnotationSave() {
    const grid = gridRef.current;
    // Scroll internal Table window to left when saving an annotation.
    // Only useful when creating a new annotation (not editing). We can enhance further.
    const scrollWindow = grid.querySelector('.MuiDataGrid-window');
    scrollWindow.scrollTo(0, scrollWindow.scrollTop);
  }

  return (
    <div className={classes.root}>

      <div>
        <Tooltip
          classes={{ tooltip: classes.tooltip }}
          title="Display context icons for columns with inferred data, annotated as primary, or as qualifier."
        >
        <FormControlLabel
          control={
            <Checkbox
              checked={isShowMarkers}
              onChange={e => setShowMarkers(e.target.checked)}
              color="primary"
            />
          }
          label="Show Additional Markers"
        />
        </Tooltip>
      </div>

      <DataGrid
        ref={gridRef}
        loading={loading}
        disableColumnMenu
        disableSelectionOnClick
        getRowId={(row) => row.__id}
        classes={{
          root: clsx([classes.grid, classes.gridScroll]),
          row: classes.row,
          cell: clsx({ [classes.disabledEvents]: isEditing }),
          columnHeader: clsx({
            [classes.disabledEvents]: isEditing,
            [classes.columnHeaderTitle]: true
          }),
        }}
        columns={formattedColumns}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        headerHeight={HEADER_HEIGHT}
        rowsPerPageOptions={rowsPerPageOptions}
        rows={rows}
        onCellClick={handleCellClick}
        onColumnHeaderClick={handleCellClick}
        onColumnHeaderOver={handleCellOver}
        onCellOver={handleCellOver}
        GridSortModel={null}
      />

      <ColumnPanel
        anchorPosition={anchorPosition}
        onClose={toggleDrawer}
        onSubmit={onAnnotationSave}

        columns={formattedColumns}
        columnName={editingColumn?.name}
        headerName={editingColumn?.headerName}
        columnStats={columnStats}

        annotations={annotations}
        annotateColumns={annotateColumns}
        inferredData={get(inferredData, editingColumn?.name)}
        validateDateFormat={validateDateFormat}

        multiPartData={multiPartData}
        setMultiPartData={setMultiPartData}

        fieldsConfig={fieldsConfig}
      />

    </div>
  );
});
