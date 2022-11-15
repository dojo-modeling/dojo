import React, {
  useCallback, useContext, useEffect, useRef, useState
} from 'react';

import axios from 'axios';

import Backdrop from '@material-ui/core/Backdrop';
import Button from '@material-ui/core/Button';
import LinearProgress from '@material-ui/core/LinearProgress';
import Link from '@material-ui/core/Link';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';
import { useHistory, useParams } from 'react-router-dom';

import LoadingOverlay from './components/LoadingOverlay';
import { ThemeContext } from './components/ThemeContextProvider';

const useStyles = makeStyles((theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
  },
  progressWrapper: {
    height: theme.spacing(3),
    margin: [[theme.spacing(3), 0, theme.spacing(4)]],
  },
  paper: {
    minHeight: '315px',
    width: '725px',
    padding: theme.spacing(3),
  },
  progress: {
    height: '12px',
    borderRadius: theme.shape.borderRadius,
  },
  warning: {
    color: theme.palette.error.main,
  },
  failNavButtons: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  failText: {
    marginBottom: theme.spacing(3),
  },
}));

const loadingText = [
  'Pulling docker image',
  'Rehydrating model',
  'Finalizing model configuration',
];

// Do this here rather than through SWR because we aren't getting any data back
// so we don't need to cache anything to revalidate in the future
const useLockStatusCheck = (modelId) => {
  const [lockExists, setLockExists] = useState(false);
  const [lockLoading, setLockLoading] = useState(true);
  const [lockError, setLockError] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    // don't run this again if we've already checked for a lock
    if (checked.current === true) return;

    axios.get(`/api/terminal/docker/locks/${modelId}`)
      .then((response) => {
        // here we're just checking if the lock exists for this model id, not whether it has
        // fully loaded (ie returns response.data.containerId.length && !== 'unset')
        // so that we can start showing the loading status page
        if (response.status === 200) {
          setLockExists(true);
          setLockLoading(false);
        }
        checked.current = true;
      }).catch((error) => {
        setLockError(true);
        setLockLoading(false);
        console.error('There was an error fetching the lock: ', error);
        checked.current = true;
      });
  }, [modelId]);

  return { lockExists, lockLoading, lockError };
};

const Provisioning = () => {
  const { setShowNavBar } = useContext(ThemeContext);
  useEffect(() => {
    // hide the navbar when the component mounts
    setShowNavBar(false);
    // when the component unmounts, toggle the navbar back
    // if setShowNavBar changes for some reason this may get called early, but then
    // it will be toggled right back to false
    return () => setShowNavBar(true);
  }, [setShowNavBar]);

  const { modelId } = useParams();
  const history = useHistory();
  const classes = useStyles();

  const [provisionState, setProvisionState] = useState('');

  const [displayedLoadingText, setDisplayedLoadingText] = useState(['Pulling docker image']);

  const { lockExists, lockLoading, lockError } = useLockStatusCheck(modelId);

  const fetchProvisionState = useCallback(() => {
    axios.get(`/api/terminal/provision/state/${modelId}`)
      .then((response) => {
        setProvisionState(response.data?.state);
      });
  }, [modelId]);

  useEffect(() => {
    document.title = 'Provisioning - Dojo';
  }, []);

  useEffect(() => {
    // fetch provision state when the page first loads
    fetchProvisionState();
  }, [fetchProvisionState]);

  useEffect(() => {
    // this should update very frequently as it tells us when the provisioned model is ready
    const mutateInterval = setInterval(() => {
      fetchProvisionState();
    }, 1000);

    return () => clearInterval(mutateInterval);
  }, [fetchProvisionState]);

  useEffect(() => {
    if (provisionState === 'ready') {
      history.push(`/term/${modelId}`);
    }
  }, [provisionState, history, modelId]);

  useEffect(() => {
    let addStep;
    // if we're processing, add another one of our steps to the displayed array every interval
    if (provisionState === 'processing') {
      addStep = setInterval(() => {
        setDisplayedLoadingText((prevText) => ([...prevText, loadingText[prevText.length]]));
      }, 4000);
    }

    return () => clearInterval(addStep);
  }, [provisionState]);

  const displayBodyText = () => {
    if (provisionState === 'failed') {
      return (
        <>
          <div className={classes.failText}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              There was an issue launching your container.
            </Typography>
            <Typography variant="subtitle1" align="center" gutterBottom>
              Please contact Jataware at&nbsp;
              <Link href="mailto:dojo@jataware.com" color="inherit">dojo@jataware.com</Link> for assistance.
            </Typography>
          </div>
          <div className={classes.failNavButtons}>
            <Button onClick={() => history.goBack()} variant="contained" disableElevation>
              Return to the Provision Page
            </Button>
            <Button href={`/summary/${modelId}`} variant="contained" disableElevation>
              Go to the Model Summary Page
            </Button>
          </div>
        </>
      );
    }
    if (provisionState === 'processing') {
      return (
        <>
          {displayedLoadingText.map((text, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Typography align="center" gutterBottom variant="subtitle1" key={i}>
              {text}
            </Typography>
          ))}
        </>
      );
    }
  };

  if (lockLoading) {
    return (
      <LoadingOverlay text={`Provisioning workers for model ${modelId}`} navHidden />
    );
  }

  if (lockError || !lockExists) {
    return (
      <LoadingOverlay
        text="There was an error setting up your container. Please try again."
        link={{ text: 'Return to the set up page', href: `/provision/${modelId}` }}
        error
        navHidden
      />
    );
  }

  return (
    <Backdrop open className={classes.backdrop}>
      <Paper className={classes.paper}>
        <div className={classes.progressWrapper}>
          <Typography gutterBottom variant="body2" align="center" className={classes.warning}>
            Note: Depending on the size of your base image, provisioning may take several minutes.
          </Typography>
          <LinearProgress
            color="primary"
            variant={
              provisionState === 'ready' || provisionState === 'failed'
                ? 'determinate' : 'indeterminate'
            }
            value={
              provisionState === 'ready' || provisionState === 'failed'
                ? 100 : 0
            }
            classes={{ root: classes.progress }}
          />
        </div>
        <Typography gutterBottom align="center" variant="h4">
          Model Container Status: {provisionState}
        </Typography>

        {displayBodyText()}

      </Paper>
    </Backdrop>
  );
};

export default Provisioning;
