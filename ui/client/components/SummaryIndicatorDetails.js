import React from 'react';

import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import CollapseText from './CollapseText';
import DatasetDownload from './DatasetDownload';
import IndicatorCountryMap from './CountryMap';

const useStyles = makeStyles((theme) => ({
  editButton: {
    float: 'right',
    border: '2px solid black',
    backgroundColor: '#808080',
    color: 'white',
    cursor: 'pointer',
  },
  buttonStyle: {
    border: '2px solid black',
    backgroundColor: 'white',
    color: 'black',
    cursor: 'pointer',

  },

  detailsPanel: {
    padding: theme.spacing(3, 2, 3, 2),
  },
  subsection: {
    marginLeft: theme.spacing(1),
  },
  modelHeader: {
    fontWeight: 'bold',
    padding: theme.spacing(1),
    textAlign: 'center',

  },
  tablePanel: {
    align: 'center',
    padding: theme.spacing(1, 1, 1, 1),
  }

}));

function SummaryIndicatorDetails({ indicator }) {
  const classes = useStyles();

  // no need to spread the following out onto a million lines
  /* eslint-disable react/jsx-one-expression-per-line */
  return (
    <Grid container>

      <Grid item xs={4}>
        <div className={classes.detailsPanel}>

          <Typography variant="subtitle2" className={classes.modelHeader}>
            Overview
          </Typography>
          <Typography variant="body2" className={classes.subsection}>
            <b> Name:</b> {indicator.name}
          </Typography>
          <Typography variant="body2" className={classes.subsection}>
            <div style={{ maxWidth: '300px' }}>
              <b>  Website: </b>
              <CollapseText childrenText={indicator.maintainer?.website} collapsedSize={20} />
            </div>
          </Typography>
          <Typography variant="body2" className={classes.subsection}>
            <b>  Family: </b> {indicator.family_name}
          </Typography>

          <Typography variant="body2" className={classes.subsection}>
            <b> Description: </b>
            <CollapseText childrenText={indicator.description} collapsedSize={40} />
          </Typography>
          <Typography variant="body2" className={classes.subsection}>
            <b> Created Date: </b> {new Date(indicator.created_at).toLocaleDateString()}
          </Typography>

          <Typography variant="body2" className={classes.subsection}>
            <b> ID: </b> {indicator.id}
          </Typography>
          <br />

          <Typography variant="body2" className={classes.subsection}>
            <DatasetDownload paths={indicator.data_paths} />
          </Typography>

        </div>
      </Grid>
      <Grid className={classes.detailsPanel} item xs={3}>
        <Typography variant="subtitle2" className={classes.modelHeader}>
          Maintainer
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          <b>  Name: </b> {indicator.maintainer?.name}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          <b>  Email: </b>  {indicator.maintainer?.email}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          <b>  Organization: </b> {indicator.maintainer?.organization}
        </Typography>
        <Typography variant="subtitle2" className={classes.modelHeader}>
          <b>  Categories </b>
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          {indicator.category?.join(', ')}
        </Typography>

      </Grid>

      <Grid className={classes.tablePanel} item xs={5}>
        <Typography variant="subtitle2" className={classes.modelHeader}>
          Geography
        </Typography>
        <IndicatorCountryMap indicator={indicator} />
      </Grid>

    </Grid>

  );
}

export default SummaryIndicatorDetails;
