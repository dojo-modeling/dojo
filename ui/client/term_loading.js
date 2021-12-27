import React, { useEffect, useState } from 'react';

import Backdrop from '@material-ui/core/Backdrop';
import LinearProgress from '@material-ui/core/LinearProgress';

import { makeStyles } from '@material-ui/core/styles';
import { useHistory } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import { sleep } from './utils';

const M = {
  E: '🛑',
  I: 'ℹ️',
  OK: '✅',
};

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
    fontFamily: 'monospace'
  },
}));

const LaunchContainer = async (worker, imageName, dockerImage, modelId) => {
  const resp = await fetch(`/api/terminal/docker/${worker}/launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: imageName, image: dockerImage, modelId })
  });

  if (resp.ok) {
    const body = await resp.json();
    return body.id;
  }
  const bodyText = await resp.text();
  throw new Error(`Failed to launch container ${bodyText}`);
};

// eslint-disable-next-line no-unused-vars
const CheckGitUrl = async (url) => {
  const resp = await fetch('/api/terminal/cors/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  if (!resp.ok) {
    throw new Error(`Invalid giturl ${url}`);
  }
};

const PingContainer = async (worker) => {
  const resp = await fetch(`/api/terminal/container/${worker}/ops/`);
  if (!resp.ok) {
    throw new Error('Container connection failed');
  }
};

const ConfigureRules = async (worker) => {
  const resp = await fetch(`/api/terminal/container/${worker}/ops/rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      block: [
        'config',
        'edit',
        'tag',
        'accessory'
      ]
    }),
  });
  if (!resp.ok) {
    throw new Error('Container configuration failed');
  }
  console.debug('Container add rules');
  console.debug(await resp.json());
};

const ConfigureRemoveEditorBlocks = async (worker) => {
  const resp = await fetch(`/api/terminal/container/${worker}/ops/rules`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      block: [
        'vim',
        'vi',
        'emacs',
        'nano',
      ]
    }),
  });
  if (!resp.ok) {
    throw new Error('Container configuration failed');
  }
  console.debug('Container remove rules');
  console.debug(await resp.json());
};

const Provision = async (worker, containerId, cmd) => {
  // store provision
  fetch(`/api/terminal/container/store/${containerId}/provisions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provisions: [cmd]
    })
  });

  const resp = await fetch(`/api/terminal/docker/${worker}/exec/${containerId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cmd }),
  });
  if (!resp.ok) {
    throw new Error(`Provision command failed ${cmd}`);
  }
};

async function* Steps(imageInfo) {
  // update this when new yields are added to keep the percentage bar correct
  const totalSteps = 8;
  function* percentage() {
    let index = 0;
    while (true) {
      yield (++index / totalSteps) * 100; // eslint-disable-line no-plusplus
    }
  }

  const p = percentage();

  const n = (m) => [p.next().value, m];
  try {
    yield n(`✨Setting Up Instance for ${imageInfo.imageName} on Worker-${imageInfo.worker}`);

    // yield n(`${M.I}Checking Git Url: ${imageInfo.gitUrl}`);
    // await CheckGitUrl(imageInfo.gitUrl);
    // yield n(`${M.OK}Url is valid`);

    // yield n(`${M.I}Launching Instance ${imageInfo.type} - ${imageInfo.size}`);
    // await sleep(2000);
    // yield n(`${M.OK}Instance created`);

    yield n(`${M.I}Launching Container `);
    const containerId = await LaunchContainer(imageInfo.worker,
      imageInfo.imageName,
      imageInfo.dockerImage,
      imageInfo.model.id);
    // start up delay
    await sleep(5000);
    yield n(`${M.OK}Container Created: ${containerId}`);

    yield n(`${M.I}Testing container connectivity`);
    await PingContainer(imageInfo.worker, containerId);
    yield n(`${M.OK}Connection succeded`);

    yield n(`${M.I}Configuring container`);
    await ConfigureRules(imageInfo.worker, containerId);
    await ConfigureRemoveEditorBlocks(imageInfo.worker, containerId);
    yield n(`${M.OK}Configuration complete`);

    // yield n(`${M.I}Cloning Repo ${imageInfo.gitUrl}`);
    // await Provision(imageInfo.worker, containerId, ['git', 'clone', imageInfo.gitUrl]);
    // yield n(`${M.OK}Repo Cloned.`);

    // Hack add python for testing
    await Provision(imageInfo.worker, containerId, ['sudo', 'apt-get', 'update']);
    // await Provision(containerId,
    //   ['sudo', 'apt-get', 'install', '-y', 'python3', 'python3-pip']);

    yield n(`${M.OK}Done.`);
  } catch (err) {
    console.error(err);
    yield [-1, `${M.E}${err.toString()}`];
    throw (err);
  }
}

const TermLoading = ({ location }) => {
  const classes = useStyles();
  const history = useHistory();
  const imageInfo = location?.state;
  const [open] = useState(true);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = React.useState(() => []);

  useEffect(() => {
    const run = async () => {
      try {
        // eslint-disable-next-line no-restricted-syntax
        for await (const [p, step] of Steps(imageInfo)) {
          if (p > 0) {
            setProgress(p);
          }
          setItems((xs) => [...xs, step]);
        }
        console.info('%cSuccessful initialization, redirecting to Term', 'background-color: #0f0; color: #000');
        setItems((xs) => [...xs, '📶Successful initialization, redirecting to Term']);
        await sleep(2000);
        history.push(`/term/${imageInfo.worker}/${imageInfo.model.id}`);
      } catch (err) {
        console.error('%cFailed initialization', 'background-color: #f00; color: #fff');
        console.error('%cWe are stuck...', 'background-color: #f00; color: #fff');
        console.error(err);
        setItems((xs) => [...xs, '💥Initialization failed. Something went horribly wrong']);
      } finally {
        // setProgressVisible(false)
      }
    };

    run();
  }, [history, imageInfo]);

  const Messages = ({ messages }) => (
    <div>
      {messages.map((s) => <div key={uuidv4()}>{s}</div>)}
    </div>
  );

  return (
    <div>
      <Backdrop className={classes.backdrop} open={open}>
        <div style={{ minHeight: '600px', width: '800px' }}>
          <div style={{ height: '20px' }}>
            <LinearProgress color="primary" variant="determinate" value={progress} />
          </div>
          <Messages messages={items} />
        </div>
      </Backdrop>
    </div>
  );
};

export default TermLoading;
