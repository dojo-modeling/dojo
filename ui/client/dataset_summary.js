import React, { useEffect, useState } from 'react';

import axios from 'axios';

import CloseIcon from '@material-ui/icons/Close';
import Container from '@material-ui/core/Container';
import Fab from '@material-ui/core/Fab';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { makeStyles, useTheme } from '@material-ui/core/styles';

import { useLocation } from 'react-router-dom';

import BasicAlert from './components/BasicAlert';
import ConfirmDialog from './components/ConfirmDialog';
import DatasetEditDialog from './components/DatasetEditDialog';
import DatasetSummaryDetails from './components/DatasetSummaryDetails';
import DatasetSummaryOutputsTable from './components/DatasetSummaryOutputsTable';
import LoadingOverlay from './components/LoadingOverlay';
import {
  useDataset
} from './components/SWRHooks';

const useStyles = makeStyles((theme) => ({
  fabsWrapper: {
    bottom: 0,
    padding: theme.spacing(2),
    position: 'fixed',
    right: 0,
    zIndex: 10,
    '& > :first-child': {
      marginRight: theme.spacing(2),
    },
  },
  containers: {
    padding: [[theme.spacing(1), theme.spacing(8), theme.spacing(1)]],
  },
  root: {
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(2)]],
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  detailsPanel: {
    backgroundColor: theme.palette.grey[300],
    borderRadius: '4px',
    borderWidth: 0,
    width: '100%',
    '&:focus': {
      outlineColor: '#fff',
      outlineWidth: 0,
      boxShadow: '0 0 10px #0c0c0c',
    },
  },
  headerText: {
    paddingTop: '10px',
  },
  deprecatedTitle: {
    backgroundColor: theme.palette.warning.main,
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.getContrastText(theme.palette.warning.main),
    padding: [[0, theme.spacing(1)]],
    position: 'absolute',
    right: 0,
    top: 12,
    transform: 'translateX(+105%)',
  },
  pageTitleWrapper: {
    margin: '0 auto',
    position: 'relative',
    width: 'max-content',
  },
}));
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const DatasetSummary = () => {
  const query = useQuery();
  const datasetId = query.get('dataset');
  const [deprecatedAlert, setDeprecatedAlert] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmDeprecateOpen, setConfirmDeprecateOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ message: '', severity: '' });

  const {
    dataset, datasetLoading, datasetError, mutateDataset
  } = useDataset(datasetId);

  const classes = useStyles();
  const theme = useTheme();
  const mediumBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    document.title = 'Dataset Summary - Dojo';
  }, []);

  useEffect(() => {
    if (dataset?.deprecated) {
      setDeprecatedAlert(true);
    }
  }, [dataset]);

  const handleDeprecateClick = () => {
    setConfirmDeprecateOpen(true);
  };

  const acceptDeprecate = () => {
    axios.put(`/api/dojo/indicators/${dataset.id}/deprecate`)
      .then((resp) => {
        console.info('Successfully deprecated the dataset:', resp);
        setAlertMessage({
          message: 'Your dataset was successfully deprecated.', severity: 'success'
        });
        setAlertOpen(true);
        setConfirmDeprecateOpen(false);
        // update dataset.deprecated to true, and tell the dataset to not re-fetch from the server
        // as it might not have updated yet (ES is slow)
        mutateDataset({ ...dataset, deprecated: true }, false);
      })
      .catch((err) => {
        console.error('There was an error deprecating the dataset:', err);
        setAlertMessage({
          message: 'There was an issue deprecating your dataset.', severity: 'error'
        });
        setAlertOpen(true);
        setConfirmDeprecateOpen(false);
      });
  };

  if (!datasetId) {
    return (
      <LoadingOverlay
        text="There was an error loading the dataset summary"
        error
        link={{ href: '/datasets', text: 'Return to the list of all datasets' }}
      />
    );
  }

  if (datasetLoading) {
    return <LoadingOverlay text="Loading summary" />;
  }

  if (datasetError) {
    return (
      <LoadingOverlay
        text="There was an error loading the dataset summary"
        error={datasetError}
        link={{ href: '/datasets', text: 'Return to the list of all datasets' }}
      />
    );
  }

  return (
    <div>

      <Container
        className={classes.root}
        component="main"
        maxWidth={mediumBreakpoint ? 'md' : 'xl'}
      >
        <div className={classes.pageTitleWrapper}>
          <Typography
            className={classes.header}
            variant="h4"
            align="center"
          >
            Dataset Summary
          </Typography>
          {dataset?.deprecated && (
            <Typography
              variant="subtitle2"
              component="div"
              className={classes.deprecatedTitle}
            >
              DEPRECATED
            </Typography>
          )}
        </div>
        <Grid container className={classes.containers}>
          <Grid item xs={12}>
            <Typography
              align="center"
              color="textSecondary"
              variant="h6"
              gutterBottom
              className={classes.headerText}
            >
              Details
            </Typography>
            <div className={classes.detailsPanel}>
              <DatasetSummaryDetails dataset={dataset} />
            </div>
          </Grid>
        </Grid>
        <Grid container className={classes.containers}>
          <Grid item xs={12}>
            <Typography
              align="center"
              color="textSecondary"
              variant="h6"
              gutterBottom
              className={classes.headerText}
            >
              Features
            </Typography>

            <DatasetSummaryOutputsTable dataset={dataset} />
          </Grid>
        </Grid>

        <div className={classes.fabsWrapper}>
          <Fab
            color="secondary"
            onClick={handleDeprecateClick}
            disabled={dataset.deprecated}
            variant="extended"
          >
            {dataset.deprecated ? 'Deprecated' : 'Deprecate Dataset'}
          </Fab>
          <Fab
            color="primary"
            onClick={() => {
              setEditDialogOpen(true);
            }}
            disabled={dataset.deprecated}
            variant="extended"
          >
            Edit Dataset
          </Fab>
        </div>

        <DatasetEditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          dataset={dataset}
        />

        <ConfirmDialog
          open={confirmDeprecateOpen}
          accept={acceptDeprecate}
          reject={() => setConfirmDeprecateOpen(false)}
          title="Are you sure you want to deprecate this dataset?"
          body="You will need to create a new version if you wish to continue using this dataset."
        />

        <BasicAlert
          alert={alertMessage}
          visible={alertOpen}
          setVisible={setAlertOpen}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        />

        <BasicAlert
          alert={{
            message: 'This dataset has been deprecated.',
            severity: 'warning',
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          autoHideDuration={null}
          action={(
            <IconButton
              color="inherit"
              onClick={() => setDeprecatedAlert(false)}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
          disableClickaway
          setVisible={setDeprecatedAlert}
          visible={deprecatedAlert}
        />
      </Container>
    </div>
  );
};

export default DatasetSummary;
