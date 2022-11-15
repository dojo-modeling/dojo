import React, { useEffect, useState } from 'react';

import axios from 'axios';

import AddIcon from '@material-ui/icons/Add';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CircularProgress from '@material-ui/core/CircularProgress';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import LinearProgress from '@material-ui/core/LinearProgress';
import RemoveIcon from '@material-ui/icons/Remove';
import Typography from '@material-ui/core/Typography';

import { useHistory } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';

import HelperTip from './components/HelperTip';

import { useDirective, useModel } from './components/SWRHooks';

import {
  useWebSocketUpdateContext,
} from './context';

import { sleep } from './utils';

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'fixed',
    bottom: '0',
    zIndex: '99',
    left: '0',
    right: '0',
    margin: [[theme.spacing(12), 'auto']],
    width: '680px',
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
    fontFamily: 'monospace',
    alignItems: 'normal',
    overflow: 'scroll',
  },
  cardContent: {
    position: 'relative',
  },
  cardContentShort: {
    position: 'relative',
    padding: theme.spacing(1),
    display: 'flex',
  },
  minimized: {
    position: 'fixed',
    bottom: 0,
    zIndex: '99',
    left: 0,
    margin: theme.spacing(2),
    width: '200px',
  },
  iconButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  spinner: {
    marginLeft: theme.spacing(2),
  },
}));

const imageTags = (modelId) => {
  const imagePrefix = process.env.NODE_ENV === 'development' ? 'dojo-test' : 'dojo-publish';
  return [`${imagePrefix}:${modelId}`];
};

const PublishContainer = ({ modelId, setUploading, mutateModel }) => {
  const { model } = useModel(modelId);
  const classes = useStyles();
  const [enableFinished, setEnableFinished] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [cleanupComplete, setCleanupComplete] = useState(false);

  const history = useHistory();

  const [publishInfo, setPublishInfo] = useState(() => ({
    publish: { status: '', message: '' },
    url: '',
    digest: '',
    image: '',
  }));

  const {
    getWebSocketId, register, unregister
  } = useWebSocketUpdateContext();

  const { directive, directiveLoading } = useDirective(modelId);

  // set up our listener for the info that we get back from the websocket connection
  useEffect(() => {
    console.debug('bind docker/publish');

    const publishHandler = (data) => {
      const item = data.split(/\r?\n/).reduce((acc, s) => (s || acc));
      console.debug(item);
      const {
        error,
        status,
        aux: { Tag, Digest } = { Tag: null, Digest: null },
        progress,
        finished,
      } = JSON.parse(item);

      if (error) {
        // if there's an error, set the publish info to error status
        console.error(error);
        setPublishInfo((p) => ({ ...p, publish: { status: 'error', message: error } }));
        throw new Error(error);
      } else if (Tag) {
        // this has something to do with dockerhub - I'm not sure if we still need it - AG
        if (!Tag.endsWith('-latest')) {
          setPublishInfo((p) => ({ ...p, digest: Digest }));
        }
      } else if (finished) {
        // this means we're actually fully finished
        // set the publish info to be finished, toggle enabledFinished, set progress percentage
        // eslint-disable-next-line no-unused-vars
        const [image, ..._] = finished;
        setPublishInfo((p) => ({
          ...p,
          image,
          url: `https://hub.docker.com/layers/${image.replaceAll(':', '/')}/images/${p.digest.replaceAll(':', '-')}?context=repo`,
          publish: { status: 'finished', message: '' }
        }));
        setEnableFinished(true);
      } else {
        // we're in progress, so keep our publish info updated
        setPublishInfo((p) => ({ ...p, publish: { status, message: progress } }));
      }
    };

    // connect the handler defined above to the websocket listener
    register('docker/publish', publishHandler);
    return (() => {
      // set up our cleanup
      console.debug('unbind docker/publish');
      unregister('docker/publish', publishHandler);
    });
  }, [register, unregister]);

  // set up the actual publish call
  useEffect(() => {
    const publishContainer = async (wsid) => {
      // the info to send to the server
      const postBody = {
        tags: imageTags(modelId),
        cwd: directive?.cwd,
        entrypoint: [],
        listeners: [wsid],
      };

      console.debug(directive);
      console.debug('start publish');
      console.debug(postBody);
      await fetch(`/api/terminal/docker/${modelId}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postBody)
      });
    };

    // the method that sets up our publish call
    const run = async () => {
      // get the websocket id from .context
      let wsid = getWebSocketId();
      console.debug(`wsid = ${wsid}`);
      while (wsid == null) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(50);
        // if we don't have it, wait until we do (and keep trying)
        wsid = getWebSocketId();
        console.debug(`sleep 50 wsid = ${wsid}`);
      }

      // now try to publish
      await publishContainer(wsid);
    };

    // wait for the directive to either load or not be there at all (return an error)
    // or if we're already uploading, don't continue
    if (directiveLoading || uploadInProgress) {
      return;
    }

    // otherwise, set our uploading flag and call run() to set off the upload (only once)
    setUploadInProgress(true);
    run();
  }, [directive, directiveLoading, getWebSocketId, modelId, uploadInProgress]);

  useEffect(() => {
    if (enableFinished && !cleanupComplete) {
      // only try to do this once, unless our request to patch the dojo model.image below fails
      setCleanupComplete(true);

      // only store the image name in the model if it isn't already there
      if (publishInfo.image !== model.image) {
        console.debug('patching model');
        // link image to model
        axios.patch(`/api/dojo/models/${modelId}`, { image: publishInfo?.image })
          .then(() => {
            // set model.image with local data once we know our PATCH was successful
            // false as the second param tells SWR to not revalidate, as we don't want
            // to risk elasticsearch being out of date right after the patch
            mutateModel({ ...model, image: publishInfo?.image }, false);

            // then tell SWR to fetch the model in 5 seconds, which should give ES enough time
            setTimeout(() => mutateModel(), 5000);
          })
          .catch((error) => {
            // if attaching the image name to the model, retry
            console.log('There was an error: ', error);
            setCleanupComplete(false);
          });
      // cleanup
      }

      console.debug('%cPublished Info', 'background: #fff; color: #000');
      console.debug(publishInfo);

      // recreate our url without the upload state, so we won't try to upload again
      history.replace(`${history.location.pathname}${history.location.search}`);

      // close the dialog after 3 seconds
      // TODO: maybe leave the dialog open with a note about the final publish step
      setTimeout(() => setUploading(false), 3000);
    }
  }, [
    enableFinished,
    publishInfo,
    setUploading,
    cleanupComplete,
    model,
    modelId,
    history,
    mutateModel,
  ]);

  const handleButtonClick = () => {
    // close the dialog because we're showing an X to click
    if (enableFinished) {
      setUploading(false);
      return;
    }

    // if minimized, make it big
    if (minimized) {
      setMinimized(false);
      return;
    }

    // if not minimized, make it small
    setMinimized(true);
  };

  return (
    <>
      {minimized ? (
        <Card className={classes.minimized} raised>
          <div className={classes.cardContentShort}>
            <IconButton
              onClick={handleButtonClick}
              size="small"
              className={classes.iconButton}
            >
              <AddIcon />
            </IconButton>
            {enableFinished ? <Typography variant="subtitle2">Upload Complete</Typography>
              : (
                <>
                  <Typography variant="subtitle2">Uploading Model</Typography>
                  <CircularProgress size="20px" className={classes.spinner} />
                </>
              )}
          </div>
        </Card>
      ) : (
        <Card className={classes.root} raised>
          <CardContent className={classes.cardContent}>
            <IconButton
              onClick={handleButtonClick}
              size="small"
              className={classes.iconButton}
            >
              {enableFinished ? <CloseIcon /> : <RemoveIcon />}
            </IconButton>
            <HelperTip
              title="Your model will be saved to Docker Hub before you can publish it.
                Please do not close your browser while the upload is in progress. Make sure
                to click PUBLISH once the upload is complete."
              dark
            >
              <Typography variant="subtitle1" component="span" gutterBottom data-test="summaryUploadDialog">
                {enableFinished
                  ? 'Upload Complete.' : 'Uploading Model to Docker Hub'}
              </Typography>
            </HelperTip>
            <LinearProgress
              color="primary"
              variant={enableFinished ? 'determinate' : 'indeterminate'}
              value={enableFinished ? 100 : 0}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PublishContainer;
