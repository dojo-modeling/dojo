import React, {
  useCallback, useEffect, useState
} from 'react';

import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { useHistory } from 'react-router-dom';

const Admin = () => {
  const fetchTimeout = () => new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('fetch timed out'));
    }, 5000);
  });

  const history = useHistory();
  const [containers, setContainers] = useState([]);
  const [isLoaded, setLoaded] = useState(false);
  const [workerNodes, setWorkerNodes] = useState([]);

  // memoize this so we don't run into any issues with the setter values changing
  // as we reference it in a useEffect below
  const refreshNodeInfo = useCallback(async () => {
    const resp = await fetch('/api/terminal/docker/nodes');
    const nodes = await resp.json();
    const nodeContainers = await Promise.all(nodes.map(async (n, i) => {
      try {
        const r = await Promise.race([fetch(`/api/terminal/docker/${n.i}/containers`),
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

    const cs = nodeContainers.reduce((acc, n) => {
      n.containers?.forEach((c) => acc.push({ node: n, container: c }));
      return acc;
    }, []);

    const csInfo = await Promise.all(
      cs.map(async (c) => {
        let info = { ok: false };
        if (c.container.Id) {
          const r = await fetch(`/api/dojo/terminal/container/${c.container.Id}`);
          if (r.ok) {
            info = { ok: r.ok, ...(await r.json()) };
          }
        }
        return { info, ...c };
      })
    );

    console.log(csInfo);
    setContainers(csInfo);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refreshNodeInfo();
  }, [refreshNodeInfo]);

  const style = {
    paper: {
      textAlign: 'center',
      margin: '20px',
      padding: '20px'
    }
  };

  const destroyContainer = async (node, id) => {
    await fetch(`/api/terminal/docker/${node}/stop/${id}`, { method: 'DELETE' });
    await refreshNodeInfo();
  };

  return (
    <>
      { isLoaded
        ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid container spacing={1} justify="center">
                {workerNodes.map((n) => (
                  <Grid item xs={3}>
                    <Paper style={style.paper}>
                      <div style={{
                        backgroundColor: (n.status === 'up') ? '#90ee90' : '#ffaaab'
                      }}
                      >
                        <div>
                          Worker -
                          {' '}
                          {n.i}
                        </div>
                        <div>
                          {n.host}
                        </div>
                        <div>
                          Status:
                          {' '}
                          {n.status}
                        </div>
                        <div>
                          Connections:
                          {' '}
                          {n.clients}
                        </div>
                        <div>
                          Containers:
                          {' '}
                          {n.containers?.length ?? 0}
                        </div>
                      </div>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Grid container justify="center">
                <Grid item xs={6}>
                  <Paper style={style.paper}>
                    {containers.map((v) => (
                      <div style={{ textAlign: 'left', paddingTop: '10px' }} key={v.container.Id}>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>
                            Worker-
                            {v.node.i}
                          </span>
                        </div>
                        <div>
                          Active Clients:
                          {' '}
                          <span style={{ fontWeight: 'bold' }}>
                            {v.node.clients}
                            {' '}
                          </span>
                        </div>
                        <div>
                          Container:
                          {' '}
                          {v.container.Id}
                        </div>
                        <div>
                          Reconnect -
                          {' '}
                          {(v.info?.ok) ? 'Available' : 'Unavailable'}
                        </div>
                        <div>
                          Model -
                          {' '}
                          {v.info?.model_id}
                        </div>
                        <div>
                          Name:
                          {' '}
                          {v.container.Names[0]}
                        </div>
                        <div>
                          Image:
                          {' '}
                          {v.container.Image}
                        </div>
                        <div style={{ paddingBottom: '10px' }}>
                          Status:
                          {' '}
                          {v.container.Status}
                        </div>
                        <div>
                          <Button
                            variant="contained"
                            color="primary"
                            disabled={v.info?.ok !== true}
                            style={{ marginRight: '20px' }}
                            onClick={
                              () => { history.push(`/term/${v.node?.i}/${v.info?.model_id}`); }
                            }
                          >
                            Reconnect
                          </Button>

                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => { destroyContainer(v.node.i, v.container.Id); }}
                          >
                            Destroy Container
                          </Button>
                        </div>
                      </div>
                    ))}
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        )
        : (
          <div style={{
            backgroundImage: 'url(/assets/loading_02.gif)',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center',
            height: '100vh',
            width: '100%'
          }}
          />
        )}
    </>
  );
};

export default Admin;
