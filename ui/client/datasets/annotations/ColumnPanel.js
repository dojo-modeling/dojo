import React from 'react';
import clsx from 'clsx';
import { Form, Formik } from 'formik';
import * as yup from 'yup';

import { withStyles } from '@material-ui/core/styles';

import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import InfoRoundedIcon from '@material-ui/icons/InfoRounded';
import EqualizerIcon from '@material-ui/icons/Equalizer';
import Drawer from '@material-ui/core/Drawer';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';

import assignWith from 'lodash/assignWith';
import difference from 'lodash/difference';
import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';
import objectValues from 'lodash/values';

import { CATEGORIES, LATLON_MAPPINGS } from './constants';
import { ColumnAnnotation } from './ColumnAnnotation';
import { cleanUnusedFields, verifyConditionalRequiredFields, verifyQualifierPrimaryRules } from './annotationRules';
import Stats from './Stats';

// TODO convert ColumnPanel to folder- have index, form, and stats/maps files within it

/**
 * This file handles both including the Drawer component, as well as
 * wrapping all form fields within a Formik Form and handling the ephemereal
 * editing state.
 * */

/**
 * */
const initialColumnValues = {
  aliases: [],
  category: CATEGORIES.feature,
  display_name: '',
  description: '',
  feature_type: 'float',
  units: '',
  units_description: '',

  isQualifies: false,
  qualifierrole: 'breakdown',
  qualifies: [],

  geo_type: 'latitude',
  coord_format: 'lonlat',
  primary: false,
  resolve_to_gadm: false,
  gadm_level: 'admin3',

  // Namespaced values, such as below (date.sample, geo.another), as only used on UI
  // If the data needs to be sent to server, it may be parsed and formatted
  // to a different shape and concepts internally (see helpers.js)
  'geo.multi-column': false,
  'geo.coordinate-pair': false,
  'geo.coordinate-pair-column': '', // if inferred data returns, use it

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
};

/**
 * Function used for assignWith and mergeWith, where null/undefined hint values are skipped.
 * */
function mergeSkipNull(initialValue, hintValue) {
  return (hintValue === null || hintValue === undefined) ? initialValue : undefined;
}

/**
 *
 * */
export function genInitialValues(inferred, columns=[]) {
  if (!inferred) { return initialColumnValues; }

  const hint = { ...inferred }; // Copy, evade mutations

  hint.feature_type = inferred.type_inference;

  // Sometimes server might send odd categories (such as when timing out)
  if (!objectValues(CATEGORIES).includes(inferred.category)) {
    console.warn('Server returned unknown inferred category. Using feature instead');
    hint.category = CATEGORIES.feature;
  }

  if (hint.category === CATEGORIES.geo) {
    try {
      hint.geo_type = hint.subcategory && hint.subcategory.toLowerCase();
    } catch(e) {
      console.error('Geo Inferred data: subcategory not a string, skipping', e);
    }

    // Infer coord pair from common lat/lon column names in historical data
    if (['latitude', 'longitude'].includes(hint.subcategory)) {
      const pairSubcategory = difference(['latitude', 'longitude'], [hint.subcategory])[0];

      const pairMatch = LATLON_MAPPINGS[pairSubcategory]
            .find(commonSubcategoryName => {
              return columns
                .find(columnData => columnData
                      .field
                      .toLowerCase() === commonSubcategoryName.toLowerCase());
            });

      if (pairMatch) {
        hint['geo.coordinate-pair-column'] = pairMatch;
      }
    }

  } else if (hint.category === CATEGORIES.time) {
    hint.date_type = hint.subcategory;
    hint.time_format = hint.format;
  }

  const unused = ['format', 'match_type', 'Parser', 'DayFirst', 'fuzzyColumn', 'subcategory', 'type_inference'];
  unused.forEach((i) => { delete hint[i]; });

  const copy = { ...initialColumnValues }; // NOTE AssignWith mutates in place, using a copy instead

  return assignWith(copy, hint, mergeSkipNull);
}

/**
 * Returns formatted multipart data from other form values
 *  (say, if user has toggled the multipart checkbox and submitted)
 * */
function generateMultiPartData(columnName, values) {
  const isGeo = values.category === CATEGORIES.geo;
  const isGeoPair = isGeo && values['geo.coordinate-pair'];
  const isGeoMultiColumn = isGeo && values['geo.multi-column'];

  const name = isGeoPair
    ? `${columnName} + ${values['geo.coordinate-pair-column']}`
    : isGeoMultiColumn
      ? [
        values['geo.multi-column.admin0'],
        values['geo.multi-column.admin1'],
        values['geo.multi-column.admin2'],
        values['geo.multi-column.admin3']
      ].filter(Boolean)
        .join(' + ')
        // isDateMultiColumn:
      : [
        values['date.multi-column.day'],
        values['date.multi-column.month'],
        values['date.multi-column.year']
      ].join(' + ');

  const parts = isGeoPair ? [columnName, values['geo.coordinate-pair-column']]
    : isGeoMultiColumn
      ? ['admin0', 'admin1', 'admin2', 'admin3']
        .map((geoPart) => values[`geo.multi-column.${geoPart}`])
        .filter(Boolean)
        // isDateMultiColumn:
      : ['day', 'month', 'year']
        .map((datePart) => values[`date.multi-column.${datePart}`]);

  return { name, parts };
}

/**
 *
 * */
export default withStyles(({ palette, spacing, breakpoints }) => ({
  root: {
    width: '40%',
    minWidth: '25rem',
    background: 'none',
    borderLeft: 'none',
  },
  expanded: {
    minWidth: '35rem',
    width: '60%',

    [breakpoints.down('sm')]: {
      minWidth: 'unset',
      width: '90vw',
    },
  },
  drawerControls: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  highlightHeading: {
    fontWeight: 'bold'
  },
  buttonContainer: {
    marginTop: spacing(0.5),
    display: 'flex',
    '& > div': {
      display: 'flex',
      flex: 1,
      justifyContent: 'flex-end'
    }
  },
  editPanel: {
    padding: '2rem',
    paddingTop: '0.5rem',
    background: palette.common.white,
    flex: 1
  },
  tabsPanel: {
    borderRight: '1px solid gray', // TODO tweak subtle border color

    '& > div': {
      marginTop: '5rem',
      height: '10rem',
      width: 0,
      paddingRight: '3rem',
      background: palette.common.white,
      marginRight: -1, // Overlap and hide left border of panel itself
      display: 'flex',
      alignItems: 'center',
      border: '1px solid gray', // TODO tweak color
      borderRadius: '6px 0 0 6px',
      borderRight: 'lightgray', // theme color
    }
  },
  statisticsButton: {
    transform: 'rotate(270deg)',
    marginLeft: -6,

    '&:hover': {
      backgroundColor: 'transparent',
      boxShadow: 'none',
    }
  }
}))(({
  anchorPosition = 'right', classes,
  columnName, headerName, columns,
  annotations, annotateColumns, inferredData,
  multiPartData, setMultiPartData,
  validateDateFormat,
  onSubmit, onClose, columnStats,
  fieldsConfig=()=>({})
}) => {

  const [displayStatistics, setDisplayStatistics] = React.useState(false);

  function clearColumnAnnotations() {
    const multiPart = get(multiPartData, columnName);

    const newAnnotations = { ...annotations };
    delete newAnnotations[columnName];

    if (multiPart) {
      multiPart.members
        .forEach((column) => {
          delete newAnnotations[column];
        });

      const multiPartColumnsToKeep = { ...multiPartData };

      delete multiPartColumnsToKeep[columnName];
      setMultiPartData(multiPartColumnsToKeep);
    }

    annotateColumns(newAnnotations);

    onClose();
  }

  const mergedFormValues = {
    ...genInitialValues(inferredData, columns),
    ...get(annotations, columnName, {})
  };

  const usingInferredValues = isEmpty(get(annotations, columnName, {})) && !isEmpty(inferredData);

  // Multi-part columns might fetch on-demand stats in the future

  const statistics = get(columnStats, `statistics.${columnName}` || {});
  const histogramData = {
    data: get(columnStats, `histograms.${columnName}.values`),
    labels: get(columnStats, `histograms.${columnName}.bins`, {}),
  };

  const statDataAvailable = !isEmpty(statistics) || !isEmpty(histogramData.labels);

  const allAnnotatedColumns = columns.filter(column => annotations[column.field]);

  return (
    <Drawer
      variant="persistent"
      classes={{ paper: clsx({[classes.root]: true, [classes.expanded]: displayStatistics }) }}
      anchor={anchorPosition}
      open={Boolean(columnName)}
      onClose={onClose}
    >
      {columnName && (
        <div style={{height: '200%', display: 'flex'}}>

          <div className={classes.tabsPanel}>
            <div>
              <Button
                fullWidth
                disableRipple
                classes={{root: classes.statisticsButton}}
                onClick={() => setDisplayStatistics(!displayStatistics)}
                disabled={!statDataAvailable}
                color="primary"
                startIcon={<EqualizerIcon />}
              >
                Statistics
              </Button>
            </div>
          </div>

          <div className={classes.editPanel}>

            <div className={classes.drawerControls}>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </div>

            <Grid
              container
              spacing={3}
            >
              <Grid
                style={{
                  display: !displayStatistics && 'none'
                }}
                item
                xs={5}
              >
                <Typography
                  variant="h5"
                  paragraph
                >
                  Statistics
                </Typography>

                <Stats
                  statistics={statistics}
                  histogramData={histogramData}
                />
              </Grid>

              <Grid item xs={!displayStatistics ? 12 : 7}>
                <Typography
                  variant="h5"
                  gutterBottom
                >
                  Annotating&nbsp;
                  <span className={classes.highlightHeading}>
                    {headerName}
                  </span>
                </Typography>

                <Formik
                  initialValues={mergedFormValues}
                  validationSchema={yup.object({
                    description: yup
                      .string('Provide description of the column.')
                      .required('Please enter a description.')
                  })}
                  validate={(values) => {
                    const qpErrors = verifyQualifierPrimaryRules(values, annotations, columnName);
                    const requiredErrors = verifyConditionalRequiredFields(values);

                    return { ...qpErrors, ...requiredErrors };
                  }}
                  onSubmit={(values) => {
                    const cleanValues = cleanUnusedFields(values);
                    const multiPartSelected = values['date.multi-column'] || values['geo.coordinate-pair'] || values['geo.multi-column'];
                    const isNewMultiPart = multiPartSelected && !get(multiPartData, columnName);

                    let targetColumnName = columnName;

                    // If we ever annotate multiPart data, we clear the individual column data
                    // and only save the multiPart "virtual" combined column annotation.
                    const individualPartsOverrides = {};

                    if (isNewMultiPart) {
                      const { name, parts } = generateMultiPartData(columnName, values);

                      // Add multiPartBase ONLY on a new multiPart
                      // If not, we would use a virtual column name as a multiPartBase
                      // which can't be true. See datasets/README definitions for questions.
                      cleanValues.multiPartBase = columnName;

                      targetColumnName = name; // the name for new multipart column we just created

                      setMultiPartData({
                        ...multiPartData,
                        [name]: {
                          members: parts,
                          name,
                          baseColumn: columnName,
                          category: values.category
                        }
                      });

                      parts.forEach((multiPartMember) => {
                        individualPartsOverrides[multiPartMember] = {};
                      });
                    }

                    const newAnnotations = {
                      ...annotations,
                      ...individualPartsOverrides,
                      [targetColumnName]: {
                        ...cleanValues,
                        annotated: true
                      }
                    };

                    annotateColumns(newAnnotations);

                    onClose();
                    onSubmit();
                  }}
                >
                  {(formik) => (
                    <Form>

                      {usingInferredValues && (
                        <Typography
                          variant="body2"
                          paragraph
                          component="div"
                          style={{display: 'flex', alignItems: 'center'}}>
                          <InfoRoundedIcon style={{marginRight: '0.5rem', color: '#51abf1b3'}} />
                          Defaults include inferred values from Dojo analysis.
                        </Typography>
                      )}

                      <ColumnAnnotation
                        columns={columns}
                        values={formik.values}
                        setFieldValue={formik.setFieldValue}
                        editingColumnName={columnName}
                        validateDateFormat={validateDateFormat}
                        annotatedColumns={allAnnotatedColumns}
                        fieldsConfig={fieldsConfig}
                      />

                      <div className={classes.buttonContainer}>
                        <Button
                          color="secondary"
                          onClick={clearColumnAnnotations}
                          {...fieldsConfig('CLEAR_BUTTON_JATAWARE_INTERNAL')}
                        >
                          Clear
                        </Button>

                        <div>
                          <Button onClick={onClose}>
                            Cancel
                          </Button>

                          <Button
                            color="primary"
                            onClick={formik.handleSubmit}
                          >
                            Save
                          </Button>

                        </div>
                      </div>

                    </Form>
                  )}
                </Formik>
              </Grid>
            </Grid>
          </div>

        </div>
      )}
    </Drawer>
  );
});
