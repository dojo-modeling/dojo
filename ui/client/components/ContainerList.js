import React from 'react';

import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import Grid from '@material-ui/core/Grid';

import { useHistory } from 'react-router-dom';

const fetchTimeout = () => new Promise((resolve, reject) => {
  setTimeout(() => {
    reject(new Error('fetch timed out'));
  }, 5000);
});

export const refreshContainerInfo = async () => {
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

  return csInfo;
};

const ContainerList = ({ containers }) => {
  const history = useHistory();

  return (
    <>
      { containers.length > 0
        ? (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <h3>
                Would you like to reconnect to an existing model execution?
              </h3>
            </Grid>

            {containers.map((c) => (
              <Grid item key={c.container.Id} xs={3}>
                <Card style={{ backgroundColor: '#e2e7ff' }}>
                  <CardActionArea
                    data-test="existingContainerBtn"
                    onClick={() => { history.push(`/term/${c.node?.i}/${c.info?.model_id}`); }}
                  >
                    <CardContent>
                      <div style={{ paddingBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {c.container.Names[0].substring(1)}
                        </span>
                      </div>
                      <div>
                        Uptime:
                        {' '}
                        {c.container.Status}
                      </div>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
        : <></> }
    </>
  );
};

export default ContainerList;
