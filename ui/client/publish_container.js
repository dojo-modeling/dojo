import React, { useEffect, useState } from 'react';

import axios from 'axios';

import AddIcon from '@material-ui/icons/Add';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import LinearProgress from '@material-ui/core/LinearProgress';
import RemoveIcon from '@material-ui/icons/Remove';
import Typography from '@material-ui/core/Typography';

import { useHistory } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';

import { useContainerWithWorker, useDirective, useModel } from './components/SWRHooks';

import {
  WebSocketContextProvider,
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
}));

const imageTags = (name, modelId) => {
  const imagePrefix = process.env.NODE_ENV === 'development' ? 'dojo-test' : 'dojo-publish';
  return [`${imagePrefix}:${name}-${modelId}`];
};

const Page = ({ workerNode, setUploading, afterUpload}) => {
  const { container } = useContainerWithWorker(workerNode);
  const { model } = useModel(container.model_id);
  const classes = useStyles();
  const [totalProgress, setTotalProgress] = useState(0);
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
    getWebSocketId, register, unregister, closeSocket
  } = useWebSocketUpdateContext();

  const { directive, directiveLoading } = useDirective(container?.model_id);

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
        progressDetail,
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
        setTotalProgress(100);
      } else {
        // we're in progress, so keep our publish info updated and set our progress percentage
        setPublishInfo((p) => ({ ...p, publish: { status, message: progress } }));
        if (progressDetail?.current) {
          const { current, total } = progressDetail;
          setTotalProgress(Math.min((current / total) * 100, 100).toFixed(2));
        }
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
        tags: imageTags(container.name, container.model_id),
        cwd: directive?.cwd,
        entrypoint: [],
        listeners: [wsid],
      };

      console.debug(directive);
      console.debug('start publish');
      console.debug(postBody);
      // make the POST
      await fetch(`/api/terminal/docker/${workerNode}/commit/${container.id}`, {
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
  }, [directive, directiveLoading, getWebSocketId, container, workerNode, uploadInProgress]);

  useEffect(() => {
    if (enableFinished && !cleanupComplete) {
      // only try to do this once, unless our request to patch the dojo model.image below fails
      setCleanupComplete(true);
      console.debug('manually close socket');
      closeSocket();

      // only store the image name in the model if it isn't already there
      if (publishInfo.image !== model.image) {
        console.debug('patching model');
        // link image to model
        axios.patch(`/api/dojo/models/${container.model_id}`, { image: publishInfo?.image })
          .then((resp) => {
            // Call afterUpload passed in from summary page to refresh model and any other cleanup
            // Delay is to allow for document store to refresh
            setTimeout(afterUpload, 300);
          })
          .catch((error) => {
            // if attaching the image name to the model, retry
            console.log('There was an error: ', error);
            setCleanupComplete(false);
          });
      }

      console.debug('%cPublished Info', 'background: #fff; color: #000');
      console.debug(publishInfo);
      console.debug('%cPublished Container', 'background: #fff; color: #000');
      console.debug(container);

      // change the url to get rid of the ?save=true query param so we won't try to upload again
      history.replace(`/summary?worker=${workerNode}`);

      // close the dialog after 3 seconds
      // TODO: maybe leave the dialog open with a note about the final publish step
      setTimeout(() => setUploading(false), 3000);
    }
  }, [
    enableFinished,
    container,
    publishInfo,
    workerNode,
    closeSocket,
    setUploading,
    history,
    cleanupComplete,
    model
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
            <Typography variant="subtitle2">Uploading: {totalProgress}%</Typography>
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
            <Typography variant="subtitle1" gutterBottom>
              {enableFinished
                ? 'Upload Complete.' : `Uploading Model to Docker Hub [${totalProgress}%]`}
            </Typography>
            <LinearProgress color="primary" variant="determinate" value={totalProgress} />
          </CardContent>
        </Card>
      )}
    </>
  );
};

const PublishContainer = ({ worker, setUploading, afterUpload }) => {
  // const { worker } = useParams();
  let proto = 'ws:';
  if (window.location.protocol === 'https:') {
    proto = 'wss:';
  }
  const url = `${proto}//${window.location.host}/api/ws/${worker}`;

  return (
    <WebSocketContextProvider url={url} autoConnect>
      <Page workerNode={worker} setUploading={setUploading} afterUpload={afterUpload} />
    </WebSocketContextProvider>
  );
};

export default PublishContainer;
