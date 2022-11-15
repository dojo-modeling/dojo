import React, {
  useEffect, useState
} from 'react';

import axios from 'axios';

import { Link } from 'react-router-dom';

import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { lighten, makeStyles, useTheme } from '@material-ui/core/styles';

import BasicAlert from './components/BasicAlert';
import LoadingOverlay from './components/LoadingOverlay';
import { useLocks, useNodes } from './components/SWRHooks';

const useStyles = makeStyles((theme) => ({
  buttonLink: {
    margin: [[theme.spacing(1), 0]],
  },
  buttonWrapper: {
    paddingTop: theme.spacing(1),
  },
  paper: {
    textAlign: 'left',
    margin: theme.spacing(2),
    padding: theme.spacing(2),
  },
  textWrapper: {
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
  },
}));

const Admin = () => {
  const classes = useStyles();
  const theme = useTheme();
  const [nodeInfo, setNodeInfo] = useState([]);
  const [shutDownFailed, setShutDownFailed] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const {
    locks, locksLoading, locksError, mutateLocks
  } = useLocks();
  const {
    nodes, nodesLoading, nodesError, mutateNodes
  } = useNodes();

  useEffect(() => {
    document.title = 'Admin - Dojo';
  }, []);

  useEffect(() => {
    const refreshNodeInfo = async () => {
      // go through all the locks and fetch their states
      const lockStates = await Promise.all(locks.map(async (lock) => {
        const response = await fetch(`/api/terminal/provision/state/${lock.modelId}`);
        if (response.ok) {
          return { ...lock, status: (await response.json()) };
        }
        return lock;
      }));

      // go through nodes and match up locks with nodes
      const nodeInformation = await Promise.all(nodes.map(async (node) => {
        const lock = lockStates.find((l) => l.host === node.host);

        // if lock then we can get model name
        if (lock) {
          // get model's name
          const getModelName = async () => {
            const resp = await axios.get(`/api/dojo/models/${lock?.modelId}`);
            return resp;
          };
          const responseModel = await getModelName();
          lock.name = responseModel?.data?.name;
        }

        return { ...node, lock };
      }));

      // order the nodes based on host name
      nodeInformation.sort((node1, node2) => {
        const name1 = node1.host.toLowerCase();
        const name2 = node2.host.toLowerCase();

        if (name1 < name2) {
          return -1;
        }
        if (name1 > name2) {
          return 1;
        }
        return 0;
      });

      setNodeInfo(nodeInformation);
      console.debug('Locks:', locks);
      console.debug('NodeInformation:', nodeInformation);
    };

    // only do this once we've loaded at least our empty arrays
    if (locks !== undefined && nodes !== undefined) {
      refreshNodeInfo(locks, setNodeInfo);
    }
  }, [locks, nodes]);

  const destroyLock = (modelId) => {
    axios.delete(`/api/terminal/docker/${modelId}/release`).then(() => {
      mutateLocks();
      mutateNodes();
    }).catch((error) => {
      setAlertMessage(`There was an error shutting down the container: ${error}`);
      setShutDownFailed(true);
    });
  };

  if (locksLoading || nodesLoading) {
    return (
      <LoadingOverlay
        text="Loading the admin page"
      />
    );
  }

  if (locksError || nodesError) {
    return (
      <LoadingOverlay
        text="There was an error loading the admin page"
        error={locksError || nodesError}
      />
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid container spacing={1} justify="center">
            {nodeInfo.map((node) => (
              <Grid item key={node.info.ID} xs={3}>
                <Paper
                  elevation={0}
                  className={classes.paper}
                  style={{
                    backgroundColor: (node.status === 'up')
                      ? lighten(theme.palette.success.light, 0.4)
                      : lighten(theme.palette.warning.light, 0.4)
                  }}
                >
                  <div>
                    <b>Worker - </b> {node.host}
                  </div>
                  <div>
                    <b>Status:</b> {node.status}
                  </div>
                  <div>
                    <b>Connections: </b>{node.clients}
                  </div>
                  <div>
                    <b>Running Containers: </b> {node.info?.ContainersRunning}
                  </div>
                  <div>
                    <b>In use by: </b>{node.lock?.name}
                  </div>
                  <div>
                    <b>Model ID: </b>{node.lock?.modelId}
                  </div>
                  <div>
                    <b> Provision State: </b> {node.lock?.status?.state}
                  </div>
                  <div>
                    <Button
                      component={Link}
                      className={classes.buttonLink}
                      variant="outlined"
                      to={`/summary/${node.lock?.modelId}`}
                      data-test="adminSummaryLink"
                      disabled={!node.lock?.modelId}
                      disableElevation
                    >
                      Link to Model Summary
                    </Button>
                  </div>
                  <div>
                    {node.lock?.status?.state === 'failed' ? (
                      <details>
                        <summary>reason</summary>
                        <p>{node.lock?.status?.message}</p>
                      </details>
                    ) : ''}
                  </div>
                  <div className={classes.buttonWrapper}>
                    <Button
                      component={Link}
                      variant="contained"
                      color="primary"
                      disabled={node.lock?.status?.state !== 'ready'}
                      disableElevation
                      fullWidth
                      to={`/term/${node.lock?.modelId}`}
                      data-test="adminReconnectLink"
                    >
                      Reconnect
                    </Button>
                  </div>
                  <div className={classes.buttonWrapper}>
                    <Button
                      variant="contained"
                      color="secondary"
                      disabled={node.lock?.status?.state !== 'ready'}
                      disableElevation
                      fullWidth
                      onClick={() => destroyLock(node.lock?.modelId)}
                      data-test="adminShutDownBtn"
                    >
                      Shut Down
                    </Button>
                  </div>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
      <BasicAlert
        alert={{ message: alertMessage, severity: 'error' }}
        visible={shutDownFailed}
        setVisible={setShutDownFailed}
      />
    </>
  );
};

export default Admin;
