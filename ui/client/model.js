import React, {
  useEffect, useState
} from 'react';

import CircularProgress from '@material-ui/core/CircularProgress';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import { HorizontalLinearStepper } from './components/ModelFormStepper';
import ContainerList, { refreshContainerInfo } from './components/ContainerList';

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(10),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  stepper: {
    marginTop: theme.spacing(3),
  },
}));

export default function Model() {
  const classes = useStyles();
  const [isLoaded, setLoaded] = useState(false);
  const [connectableContainers, setConnectableContainers] = useState(false);

  const loader = async () => {
    const containers = await refreshContainerInfo();
    console.debug(containers);
    const availableContainers = containers.filter((c) => c.info?.ok && c.node?.clients === 0);
    setConnectableContainers(availableContainers);
    setLoaded(true);
  };

  useEffect(() => {
    loader();
  }, []);

  return (
    <>
      <Container component="main" maxWidth="md">
        <div className={classes.paper}>

          <Typography component="h3" variant="h4">
            Register Model
          </Typography>

          <Container className={classes.stepper}>
            <HorizontalLinearStepper />
          </Container>

          { isLoaded
            ? <ContainerList containers={connectableContainers} />
            : (
              <div>
                <CircularProgress />
              </div>
            )}

        </div>
      </Container>

    </>
  );
}
