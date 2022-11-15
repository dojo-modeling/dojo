import React, { useCallback, useEffect, useState } from 'react';

import Autocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import Container from '@material-ui/core/Container';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

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
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(2)]],
  },
  gridContainer: {
    minHeight: '100vh',
    paddingTop: theme.spacing(14),
  },
  paper: {
    padding: theme.spacing(2),
    color: theme.palette.text.secondary,
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
}));

// todo delete
// eslint-disable-next-line no-unused-vars
const getProvisioning = (imageType) => {
  switch (imageType) {
    case 'ubuntu':
      return [['sudo', 'apt-get', 'update']];
    case 'ubuntu-python':
      return [
        ['sudo', 'apt-get', 'update'],
        ['sudo', 'apt-get', 'install', '-y', 'python3', 'python3-pip']
      ];
    case 'ubuntu-r':
      return [
        ['sudo', 'apt-get', 'update'],
        ['sudo', 'apt-get', 'install', '-y', '--no-install-recommends', 'software-properties-common', 'dirmngr'],
        ['sudo', 'apt-key', 'adv', '--keyserver', 'keyserver.ubuntu.com', '--recv-keys', 'E298A3A825C0D65DFD57CBB651716619E084DAB9'],
        ['sudo', 'add-apt-repository', 'deb https://cloud.r-project.org/bin/linux/ubuntu focal-cran40/'],
        ['sudo', 'apt-get', 'install', '-y', '--no-install-recommends', 'r-base'],
      ];
    default:
      break;
  }
  return [];
};

const formatImageString = (s) => s.replace(/\s+/g, '').replace(/[^a-zA-Z0-9_.-]/, '_');

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Intro = () => {
  const classes = useStyles();
  const history = useHistory();
  const query = useQuery();
  const relaunch = query.has('relaunch');
  const { modelId } = useParams();

  const { model, modelLoading, modelError } = useModel(modelId);

  const [imageInfo, setImageInfo] = useState({});

  const [alertVisible, setAlertVisible] = useState(false);

  const [alert, setAlert] = useState({
    severity: 'error',
    message: ''
  });

  const onImageInfoUpdate = useCallback((val, type) => {
    setImageInfo((prev) => ({ ...prev, ...{ [type]: val } }));
  }, []);

  useEffect(() => {
    if (model) {
      setImageInfo({
        model,
        imageName: formatImageString(model.name),
        dockerImage: '',
        gitUrl: model?.maintainer?.website ?? '',
        worker: '',
      });
    }
  }, [model]);

  const launchTerm = async (e) => {
    e.preventDefault();

    // validate
    if (imageInfo.dockerImage === '') {
      setAlert({ severity: 'error', message: 'Please select an Image' });
      setAlertVisible(true);
      return;
    }

    if (imageInfo.worker === '') {
      setAlert({ severity: 'error', message: 'Please select a worker' });
      setAlertVisible(true);
      return;
    }
    history.push('/loadingterm', imageInfo);
  };

  const fetchTimeout = () => new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('fetch timed out'));
    }, 5000);
  });

  const [baseImageList, setBaseImageList] = React.useState([]);
  // eslint-disable-next-line no-unused-vars
  const [containers, setContainers] = React.useState([]);
  const [workerNodes, setWorkerNodes] = React.useState([]);
  const [workersIsLoaded, setWorkersIsLoaded] = React.useState(false);

  // if we come in with the relaunch parameter set, we want to continue where we left off
  // so load the model's existing image as the dockerImage that we'll pass along to launch
  // the terminal
  useEffect(() => {
    if (relaunch && model) {
      setImageInfo((prev) => (
        { ...prev, ...{ dockerImage: model?.image } }
      ));
    }
  }, [relaunch, model]);

  // find the image & display name that matches our model's image for the autocomplete
  const getRelaunchBaseImage = () => (
    baseImageList.find((image) => image.image === model?.image)
  );

  useEffect(() => {
    // define this inside here so useEffect knows it is stable
    const refreshNodeInfo = async () => {
      const resp = await fetch('/api/clouseau/docker/nodes');
      const nodes = await resp.json();

      const nodeContainers = await Promise.all(nodes.map(async (n, i) => {
        try {
          const r = await Promise.race([fetch(`/api/clouseau/docker/${n.i}/containers`),
            fetchTimeout()]);

          if (!r.ok) {
            return { ...n, i, status: 'down' };
          }

          return {
            ...n,
            i,
            status: 'up',
            containers: await r.json()
          };
        } catch (e) {
          return { ...n, i, status: 'timeout' };
        }
      }));

      setWorkerNodes(nodeContainers);
      console.debug(nodeContainers);

      const cs = nodeContainers.reduce((acc, n) => {
        n.containers?.forEach((c) => acc.push({ node: n, container: c }));
        return acc;
      }, []);

      setContainers(cs);
      setWorkersIsLoaded(true);
    };

    refreshNodeInfo();
    fetch('/api/dojo/ui/base_images').then(async (r) => setBaseImageList(await r.json()));
  }, []);

  const displayWorkerCard = (worker) => {
    let workerBusy;
    if (process.env.NODE_ENV === 'development') {
      // if we are on dev, we may run all our containers on the same worker (socat setup)
      workerBusy = worker.clients > 0;
    } else {
      // but everywhere else, any containers on a worker means it is busy
      workerBusy = worker.clients > 0 || worker.containers?.length;
    }

    let cardBackgroundColor = 'unset';
    let headerColor = '#00f000';
    let status = 'Available';
    let disabled = null;

    // some repetition here, but it's more readable than many ternaries
    if (worker.status !== 'up') {
      cardBackgroundColor = '#ff0000';
      status = 'Down';
      disabled = true;
      headerColor = '#f00000';
    }

    if (workerBusy) {
      cardBackgroundColor = '#ffcccc';
      status = 'Busy';
      disabled = true;
      headerColor = '#f00000';
    }

    return (
      <Grid item key={worker.i} xs={4}>
        <Card style={{ backgroundColor: cardBackgroundColor }}>
          <div style={{ backgroundColor: headerColor, height: '10px' }} />
          <CardActionArea
            onClick={() => onImageInfoUpdate(worker.i, 'worker')}
            data-test="modelWorkerCardBtn"
            disabled={disabled}
            style={{ backgroundColor: (worker.i === imageInfo.worker) ? '#e8fee4' : 'unset' }}
          >
            <CardContent>
              <span style={{ fontWeight: 'bold' }}>
                Worker-
                {worker.i}
              </span>
              <span>
                {' - '}
                {status}
              </span>
              <br />
              <span style={{ fontSize: 'smaller' }}>
                Connections:
                {worker.clients}
              </span>
              <br />
              <span style={{ fontSize: 'smaller' }}>
                Containers:
                {worker.containers?.length ?? 0}
              </span>
            </CardContent>
          </CardActionArea>
        </Card>
      </Grid>
    );
  };

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
          Setup a Container
        </Typography>

        <Paper className={classes.paper} elevation={3} style={{ minWidth: '600px' }}>
          <Typography variant="h5" id="tableTitle" component="div">
            {model?.name}
          </Typography>

          <Grid item xs={12} className={classes.gridItem}>
            <FormControl className={classes.formControl} fullWidth>
              {baseImageList.length ? (
                <Autocomplete
                  options={baseImageList}
                  value={(relaunch && getRelaunchBaseImage()) || imageInfo?.model?.dockerImage}
                  disabled={relaunch}
                  getOptionLabel={(option) => option.display_name}
                  onChange={(e, value) => onImageInfoUpdate(value?.image, 'dockerImage')}
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
              ) : <span> loading ... </span>}
            </FormControl>

          </Grid>

          <Grid item xs={12} className={classes.gridItem}>
            <div>Select a Worker</div>
            <Grid container spacing={1}>
              { workersIsLoaded ? workerNodes.map((worker) => (
                displayWorkerCard(worker)
              )) : (
                <Grid item xs={6}>
                  Loading Workers...
                  <div style={{ height: '20px' }}>
                    <LinearProgress color="primary" />
                  </div>
                </Grid>
              )}
            </Grid>
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

      <BasicAlert alert={alert} visible={alertVisible} setVisible={setAlertVisible} />
    </Container>
  );
};

export default Intro;
