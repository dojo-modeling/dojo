import React, { useEffect, useRef, useState } from 'react';

import axios from 'axios';

import { useHistory } from 'react-router-dom';

import Button from '@material-ui/core/Button';

import BasicAlert from './BasicAlert';

import {
  useWebSocketUpdateContext,
} from '../context';

const SummaryWebSocketHandler = ({ modelId, relaunch }) => {
  const history = useHistory();

  const {
    register, unregister, closeSocket
  } = useWebSocketUpdateContext();

  const [alertOpen, setAlertOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [alertType, setAlertType] = useState('warning');

  // instance variable to hang onto our backup shutdown timer timeout id
  const manualShutdownTimer = useRef();

  useEffect(() => {
    if (relaunch) {
      setAlertOpen(true);
      setAlertType('info');
    }
  }, [relaunch]);

  useEffect(() => {
    const handleShutdown = (payload) => {
      if (manualShutdownTimer.current) {
        // cancel the manual shutdown timer if it exists
        clearTimeout(manualShutdownTimer.current);
      }

      console.info('WS Auto-shutdown Final Message:', payload);
      setAlertOpen(true);
      setAlertType('info');
      // close the websocket connection because we are shutting everything down
      closeSocket();
      // replace the param that tells the summary page we have a container locked with our new
      // relaunch one that tells it we are in the 'relaunch' state - to show the relaunch
      // alert here and point the 'back to terminal' button to /provision
      history.replace(`/summary/${modelId}?relaunch=true`);
    };

    const handleHeartbeat = (payload) => {
      const parsedPayload = JSON.parse(payload);
      console.info('WS Auto-shutdown Heartbeat Message', parsedPayload);
      setTimeLeft(parsedPayload.seconds);

      if (parsedPayload.seconds <= 5) {
        // start our own 20 second shutdown timer in case the server shutdown message doesn't come
        manualShutdownTimer.current = setTimeout(() => {
          handleShutdown();
        }, 20000);
      }
    };

    const handleWarning = (payload) => {
      console.info('WS Auto-shutdown Warning Message:', payload);
      setAlertOpen(true);
      setAlertType('warning');
    };

    // because this also displays the post shutdown 'info' alert on the summary page without
    // websocketcontext, we need to conditionally call register here or we'll get an error
    if (register) {
      register('term/heartbeat', handleHeartbeat);
      register('term/warning', handleWarning);
      register('term/shutdown', handleShutdown);
    }

    if (unregister) {
      return (() => {
        unregister('term/heartbeat', handleHeartbeat);
        unregister('term/warning', handleWarning);
        unregister('term/shutdown', handleShutdown);
      });
    }
  }, [register, unregister, history, modelId, closeSocket]);

  const cancelShutdown = () => {
    axios.get(`/api/terminal/docker/${modelId}/shutdown/extend`)
      .then(() => {
        setAlertType('success');
      }).catch(() => {
        setAlertType('error');
      });
  };

  const startAgain = () => {
    // send us to the provision page
    history.push(`/provision/${modelId}?relaunch=true`);
  };

  const alertContent = () => {
    const contents = {
      // 60 second shutdown warning
      warning: {
        message: `Your terminal session will close in less than ${timeLeft} seconds`,
        button: "I'm still working",
        button2: 'Dismiss',
        // give this a good long time in case our heartbeat timer is slow for any reason
        duration: 120000,
        onClick: cancelShutdown,
      },
      // extend shutdown success
      success: {
        message: 'Your terminal session has been extended for another 15 minutes',
        button: 'Dismiss',
        duration: 30000,
        onClick: () => setAlertOpen(false),
      },
      // extend shutdown failed
      error: {
        message: 'Sorry, your terminal session has already been closed. Please start a new session.',
        button: 'Start a new session',
        button2: 'Dismiss',
        duration: 60000,
        onClick: startAgain,
      },
      // post shutdown
      info: {
        message: 'Your terminal session has been automatically shut down.',
        button: 'Start a new session',
        button2: 'Dismiss',
        duration: 300000,
        onClick: startAgain,
      }
    };

    return contents[alertType];
  };

  const content = alertContent();

  return (
    <>
      <BasicAlert
        alert={{
          message: content.message,
          severity: alertType,
        }}
        visible={alertOpen}
        setVisible={setAlertOpen}
        autoHideDuration={content.duration}
        action={(
          <>
            <Button
              onClick={content.onClick}
              color="inherit"
              size="small"
            >
              {content.button}
            </Button>
            {content.button2 && (
              /* This is currently only a dismiss button */
              <Button color="inherit" onClick={() => setAlertOpen(false)}>
                {content.button2}
              </Button>
            )}
          </>
        )}
      />
    </>
  );
};

export default SummaryWebSocketHandler;
