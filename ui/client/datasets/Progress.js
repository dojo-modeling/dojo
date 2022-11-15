import React from 'react';
import { withStyles } from '@material-ui/core/styles';

import Alert from '@material-ui/lab/Alert';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import Typography from '@material-ui/core/Typography';

/**
 *
 * */
const ColumnSummary = withStyles(() => ({
  tableDefinition: {
    display: 'table', width: 'auto'
  },
  tableRow: {
    display: 'table-row',
    '& dt': {
      display: 'table-cell',
      width: 100
    },
    '& dd': {
      display: 'table-cell',
      width: 'fit-content'
    }
  },
  field: {
    background: '#f4f4f4',
    display: 'inline-block',
    padding: 6,
    marginRight: '0.5rem'
  }
}))(({
  classes, heading, data = [], fallbackMessage
}) => (
  <dl className={classes.tableDefinition}>
    <div className={classes.tableRow}>
      <dt>{heading}</dt>
      <dd>
        {data.length
          ? data.map((entry) => (
            <span className={classes.field}>
              {entry}
            </span>
          )) : (
            <p>{fallbackMessage}</p>
          )}
      </dd>
    </div>
  </dl>
));

/**
 * Annotation Summary Breakdown; AkA Progress.
 * A bit of a cheatsheet to identify miulti-columns, potential conflicts
 * Especially useful on datasets with more columns than we can easily navigate
 * and visualize on tabular view
 * */
export default withStyles((theme) => ({
  root: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1201,
    padding: theme.spacing(0.5),

    borderTop: '1px solid #90a4ae',
    // borderTop: `1px solid rgb(181, 211, 240)`
  },
  headingWrapper: {
    height: '3rem',
    '&.Mui-expanded': {
      minHeight: 'unset',
      margin: '0 0 0 0'
    }
  },
  heading: {
    '&.Mui-expanded': {
      margin: 0
    }
  },
  expandedContent: {
    display: 'block',
    padding: '0 1rem'
  },
}))(({ classes }) => (
  <Accordion
    className={classes.root}
    elevation={0}
    square
    variant="outlined"
  >

    <AccordionSummary
      classes={{
        root: classes.headingWrapper,
        content: classes.heading
      }}
      expandIcon={<ExpandLessIcon />}
    >
      <Typography component="h5" variant="h5">
        Progress
      </Typography>
    </AccordionSummary>

    <AccordionDetails className={classes.expandedContent}>

      <Alert severity="info" style={{ marginTop: '1rem' }}>
        A column can consist of one or multiple associated columns.
      </Alert>

      <Typography
        variant="body2"
        component="div"
      >

        <ColumnSummary
          heading="Dates"
          data={[]}
          fallbackMessage="Please annotate your date from column(s) in the dataset."
        />

        <ColumnSummary
          heading="Geo"
          data={[]}
          fallbackMessage="Please annotate at least one Primary geo column(s) before submitting."
        />

        <ColumnSummary
          heading="Features"
          data={[]}
          fallbackMessage="At least one feature needs to be annotated, to be used as a data point."
        />

      </Typography>

    </AccordionDetails>

  </Accordion>
));
