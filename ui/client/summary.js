import React, { useEffect } from 'react';

import axios from 'axios';

import { useHistory, useLocation, useParams } from 'react-router-dom';

import LoadingOverlay from './components/LoadingOverlay';
import SummaryContents from './components/SummaryContents';
import {
  WebSocketContextProvider,
} from './context';

import { useLock, useModel } from './components/SWRHooks';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Summary = () => {
  const { modelId } = useParams();
  const history = useHistory();
  const query = useQuery();
  // we have a terminal session running
  const terminal = query.get('terminal');
  // we want to show the intro dialog
  const intro = query.get('intro');
  // we just shut down a terminal session and want to show the relaunch state
  const relaunch = query.get('relaunch');

  let proto = 'ws:';
  if (window.location.protocol === 'https:') {
    proto = 'wss:';
  }
  const url = `${proto}//${window.location.host}/api/ws/${modelId}`;

  const {
    model, modelLoading, modelError, mutateModel
  } = useModel(modelId);

  // confirm existence of a lock with the backend
  const { lock } = useLock(modelId);

  useEffect(() => {
    document.title = 'Model Summary - Dojo';
  }, []);

  useEffect(() => {
    // if we have a container locked (a terminal session running)
    if (lock) {
      // start auto shutdown timer when we hit the page
      axios.put(`/api/terminal/docker/${modelId}/shutdown/start`)
        .then(() => {
          console.log('Container auto-shutdown sequence initiated');
        });
    }
    // if we arrive with the terminal param but no lock, get rid of the terminal param
    if (terminal === 'true' && !lock) {
      history.replace(`/summary/${modelId}`);
    }
  }, [modelId, terminal, history, lock]);

  // if the model is loading or returns an error, don't show the page yet
  if (modelLoading) {
    return <LoadingOverlay text="Loading summary" />;
  }

  if (modelError) {
    return (
      <LoadingOverlay
        text="There was an error loading the model summary"
        error={modelError}
      />
    );
  }

  // only load the websocketed version of the summary page if we have the terminal param
  // and we've confirmed with the backend that we have a lock on the container
  if (lock && terminal) {
    // if we confirmed above that we have our lock, then load the websocket on the page
    return (
      <WebSocketContextProvider url={url}>
        <SummaryContents
          model={model}
          mutateModel={mutateModel}
          // boolean prop that represents that we have both the 'terminal' query param
          // and the successful 'lock' API call to confirm the existence of a lock
          locked
          intro={intro}
        />
      </WebSocketContextProvider>
    );
  }

  return (
    <SummaryContents
      model={model}
      mutateModel={mutateModel}
      intro={intro}
      relaunch={relaunch}
    />
  );
};

export default Summary;
