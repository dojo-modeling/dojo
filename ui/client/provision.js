import React, { useEffect, useState } from 'react';

import axios from 'axios';

import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import Link from '@material-ui/core/Link';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import Autocomplete, { createFilterOptions } from '@material-ui/lab/Autocomplete';

import { makeStyles } from '@material-ui/core/styles';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import { useModel } from './components/SWRHooks';

import BasicAlert from './components/BasicAlert';
import LoadingOverlay from './components/LoadingOverlay';

const useStyles = makeStyles((theme) => ({
  formControl: {
    minWidth: 200,
  },
  root: {
    flexGrow: 1,
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(20)]],
  },
  gridContainer: {
    minHeight: '100vh',
    paddingTop: theme.spacing(14),
  },
  paper: {
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
    width: '600px',
  },
  gridItem: {
    paddingBottom: '12px'
  },
  paperRoot: {
    display: 'flex',
    flexWrap: 'wrap',
    '& > *': {
      margin: theme.spacing(1),
      width: theme.spacing(16),
      height: theme.spacing(16),
    },
  },
  loading: {
    // very specific here to match the height of the autocomplete and not cause a jump
    height: '43px',
  },
  explainerText: {
    margin: [[0, theme.spacing(1), theme.spacing(2)]]
  }
}));

const filter = createFilterOptions();

const formatImageString = (s) => s.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_.-]/, '_');

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Provision = () => {
  const classes = useStyles();
  const history = useHistory();
  const query = useQuery();
  const relaunch = query.has('relaunch');
  const { modelId } = useParams();

  const { model, modelLoading, modelError } = useModel(modelId);

  // the image info we'll eventually send to be provisioned
  const [imageInfo, setImageInfo] = useState({});

  const [alertVisible, setAlertVisible] = useState(false);
  // the value we display in the autocomplete - track this separately from the image
  // info to allow us to display custom image names that users type in
  const [autocompleteValue, setAutocompleteValue] = useState('');

  const [alert, setAlert] = useState({
    severity: 'error',
    message: ''
  });

  useEffect(() => {
    document.title = 'Provision - Dojo';
  }, []);

  useEffect(() => {
    if (model) {
      setImageInfo({
        model,
        imageName: formatImageString(model.name),
        dockerImage: '',
        gitUrl: model?.maintainer?.website ?? '',
      });
    }
  }, [model]);

  const launchTerm = async (e) => {
    e.preventDefault();

    // validate
    if (!imageInfo.dockerImage) {
      setAlert({ severity: 'warning', message: 'Please select an Image' });
      setAlertVisible(true);
      return;
    }

    axios.post(`/api/terminal/docker/provision/${modelId}`,
      {
        name: modelId,
        image: imageInfo.dockerImage,
        listeners: []
      }).then((response) => {
      console.info('Provision Response:', response);

      history.push(`/provisioning/${modelId}`, imageInfo);
    }).catch((error) => {
      if (error.response.status === 409) {
        // Lock already created, proceed to provisioning
        console.info('Lock exists :', error.response);
        history.push(`/provisioning/${modelId}`, imageInfo);
      } else {
        console.error('Error provisioning worker:', error);
        setAlert({ severity: 'error', message: 'Error provisioning worker' });
        setAlertVisible(true);
      }
    });
  };

  const [baseImageList, setBaseImageList] = React.useState([]);
  // eslint-disable-next-line no-unused-vars
  const [containers, setContainers] = React.useState([]);

  // This handles the model relaunch setup
  useEffect(() => {
    if (relaunch && model) {
      // if we come in with the relaunch parameter set, we want to continue where we left off
      // so load the model's existing image as the dockerImage that we'll pass along to launch
      // the terminal
      setImageInfo((prev) => (
        { ...prev, ...{ dockerImage: model?.image } }
      ));

      // and set it as the autocomplete's display value
      setAutocompleteValue(model?.image);
    }
  }, [relaunch, model]);

  const getOptionLabel = (option) => {
    // MUI complains about several "" options for some reason without this
    if (typeof option === 'string') {
      return option;
    }

    return option.display_name;
  };

  const handleOnChange = (event, newValue) => {
    if (newValue && newValue.inputValue) {
      // show this warning if they're setting a custom image
      setAlert({
        severity: 'info',
        message: 'Please ensure that your image exists on Docker Hub and is Debian based.'
      });
      setAlertVisible(true);
      // use the inputValue here as the displayName has the 'Add my own...' message tacked on
      setAutocompleteValue(newValue?.inputValue);
    } else {
      // whereas here the display name is what we want (unless it is blank, then an empty string)
      setAutocompleteValue(newValue?.display_name || '');
    }

    // and update our dockerImage attribute on the image that we will eventually provision
    setImageInfo((prev) => ({ ...prev, ...{ dockerImage: newValue?.image } }));
  };

  const handleFilter = (options, params) => {
    const filtered = filter(options, params);

    const { inputValue } = params;
    // if anything in the options matches our input value
    const isExisting = options.some((option) => inputValue === option.display_name);
    // if we have an input value and it isn't in our list, then show it as an option to be added
    if (inputValue !== '' && !isExisting) {
      filtered.push({
        inputValue,
        display_name: `Add Debian image from Docker Hub: "${inputValue}"`,
        image: inputValue,
      });
    }

    return filtered;
  };

  useEffect(() => {
    // skip this fetch if we are relaunching, then we won't show a list at all
    if (!relaunch) {
      axios('/api/dojo/ui/base_images').then((response) => setBaseImageList(response.data));
    }
  }, [relaunch]);

  if (modelLoading) {
    return <LoadingOverlay text="Loading..." />;
  }

  if (modelError) {
    return (
      <LoadingOverlay
        text="There was an error loading the model"
        error={modelError}
      />
    );
  }

  return (
    <Container
      className={classes.root}
      component="main"
    >
      <Grid
        container
        spacing={3}
        direction="column"
        alignItems="center"
        className={classes.gridContainer}
      >
        <Typography variant="h5" id="tableTitle" component="div" style={{ marginBottom: '20px' }}>
          Select starting image for running your model
        </Typography>

        <Paper className={classes.paper} elevation={3}>

          {/* <Typography variant="h5" id="tableTitle" component="div" gutterBottom>
           <b> Model: </b> {model?.name}
          </Typography> */}

          <div className={classes.explainerText}>
            <ul>
              <li>
                <Typography variant="body2">
                  In the next step, you will launch a virtual environment in which you will
                  set up and run your model with default values.
                </Typography>
              </li>
              <br />
              <li>
                <Typography variant="body2">
                  You can select an existing container image from Dojo’s library or choose
                  your own Debian based image from Docker Hub by entering its tag.
                </Typography>
              </li>
              <br />
              <li>
                <Typography variant="body2">
                  In the dropdown below select a base image for the
                  virtual environment that can successfully run
                  your model. You will be able to install any required
                  packages or load any data files once you
                  launch the environment.
                </Typography>
              </li>
              <br />
              <li>
                <Typography variant="body2">
                  Once the terminal finishes provisioning, run your model with default values.
                  After the run completes, be sure to mark the command you used to run your
                  model in the history to the right.
                </Typography>
              </li>
              <br />
              <li>
                <Typography variant="body2">
                  Once the model has been run, you&apos;ll use the&nbsp;
                  <Link
                    href="https://www.dojo-modeling.com/cheatsheet.html#dojo-terminal-commands"
                    target="_blank"
                    rel="noopener"
                  >
                    Built-in &quot;dojo&quot; command
                  </Link>
                  &nbsp;to set your model parameters and annotate your model outputs.
                </Typography>
              </li>
              <br />
              {/* <Typography variant="body2">
              For example, you can enter&nbsp;
              <Box component="span" fontWeight="fontWeightMedium">python:3.9.10-slim-buster</Box>
              &nbsp;to use it from Docker Hub.
            </Typography> */}

              <Typography variant="body2" gutterBottom>
                See&nbsp;
                <Link
                  href="https://www.dojo-modeling.com/docker.html"
                  target="_blank"
                  rel="noopener"
                >
                  Dojo’s docs
                </Link>
                &nbsp;for more information on using prebuilt containers.
              </Typography>
            </ul>
          </div>

          <Grid item xs={12} className={classes.gridItem}>
            <FormControl className={classes.formControl} fullWidth>
              {/* don't show the loading spinner if we have the relaunch param as in that case
                we aren't fetching base images */}
              {baseImageList.length || relaunch ? (
                <Autocomplete
                  data-test="selectImage"
                  options={baseImageList}
                  value={autocompleteValue}
                  /* if we failed to get a value for relaunch, don't disable */
                  disabled={(relaunch && !!autocompleteValue)}
                  getOptionLabel={getOptionLabel}
                  onChange={handleOnChange}
                  filterOptions={handleFilter}
                  freeSolo
                  selectOnFocus
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={
                        relaunch ? 'Your existing image has been preselected below'
                          : 'Select or search for a base image'
                      }
                    />
                  )}
                />
              ) : (
                <Typography
                  variant="subtitle1"
                  align="center"
                  gutterBottom
                  className={classes.loading}
                >
                  loading ...
                </Typography>
              )}
            </FormControl>

          </Grid>

          <Grid item xs={12} className={classes.gridItem}>
            <FormControl className={classes.formControl}>
              <Button
                color="primary"
                data-test="modelContainerLaunchBtn"
                onClick={launchTerm}
                variant="contained"
              >
                Launch
              </Button>
            </FormControl>
          </Grid>
        </Paper>
      </Grid>

      <BasicAlert
        alert={alert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        visible={alertVisible}
        setVisible={setAlertVisible}
      />
    </Container>
  );
};

export default Provision;
