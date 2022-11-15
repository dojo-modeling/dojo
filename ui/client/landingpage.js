import React, { useEffect, useState } from 'react';

import axios from 'axios';

import { Link as RouterLink } from 'react-router-dom';

import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import CssBaseline from '@material-ui/core/CssBaseline';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';

import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import AssessmentIcon from '@material-ui/icons/Assessment';
import ComputerIcon from '@material-ui/icons/Computer';
import GitHubIcon from '@material-ui/icons/GitHub';
import LoopIcon from '@material-ui/icons/Loop';
import MenuBookIcon from '@material-ui/icons/MenuBook';

import useSWRImmutable from 'swr/immutable';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  topContentWrapper: {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#06B8EF',
    backgroundImage: 'linear-gradient(to right, #06B8EF, #A11BDA)',
    color: 'white',
    [theme.breakpoints.up('lg')]: {
      padding: theme.spacing(4),
    },
    [theme.breakpoints.down('lg')]: {
      padding: [[theme.spacing(3), theme.spacing(4), theme.spacing(1)]],
    },
  },
  topHeaderTitle: {
    fontSize: '5rem',
    fontWeight: '450',
    maxWidth: '900px',
    [theme.breakpoints.up('lg')]: {
      marginBottom: theme.spacing(6),
    },
    [theme.breakpoints.down('lg')]: {
      marginBottom: theme.spacing(3),
    },
  },
  topHeaderSubtitle: {
    maxWidth: '70%',
    [theme.breakpoints.up('lg')]: {
      marginBottom: theme.spacing(6),
    },
    [theme.breakpoints.down('lg')]: {
      marginBottom: theme.spacing(3),
    },
  },
  bottomContentWrapper: {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(4),
    height: '100%',
    [theme.breakpoints.down('lg')]: {
      padding: [[theme.spacing(3), theme.spacing(4), theme.spacing(4)]],
    },
  },
  bottomContentContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  linksWrapper: {
    display: 'flex',
    gap: theme.spacing(4),
    alignItems: 'flex-start',
    marginBottom: theme.spacing(3),

  },
  links: {
    display: 'flex',
    gap: theme.spacing(4),
    flexWrap: 'wrap',
  },
  link: {
    display: 'block',
    color: 'black',
    textDecoration: 'underline',
  },
  linkCta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    maxWidth: '220px',
    minWidth: '220px',
  },
  resizedLabel: {
    ...theme.typography.h6,
  },
  learnMoreLoggedIn: {
    marginTop: theme.spacing(10),
  },
  learnMoreLoggedOut: {
    marginTop: theme.spacing(6),
  },
  button: {
    color: 'black',
    backgroundColor: 'white',
    minWidth: '230px',
  },
  bigIcon: {
    fontSize: '3rem',
  },
}));

const fetcher = (url) => axios.get(url).then((res) => res.data);

const useModels = () => {
  // use immutable version of SWR to only load data when the page initially loads
  // since we're just getting the 'hits' for the total count
  const { data, error } = useSWRImmutable('/api/dojo/models/latest', fetcher);

  return {
    models: data,
    modelsLoading: !data && !error,
    modelsError: error,
  };
};

const useRuns = () => {
  const { data, error } = useSWRImmutable('/api/dojo/runs', fetcher);

  return {
    runs: data,
    runsLoading: !data && !error,
    runsError: error,
  };
};

const LandingPage = () => {
  const classes = useStyles();
  const [loggedIn] = useState(true);

  const { models, modelsLoading, modelsError } = useModels();
  const { runs, runsLoading, runsError } = useRuns();

  useEffect(() => {
    document.title = 'Home - Dojo';
  }, []);

  return (
    <>
      <CssBaseline />
      <div className={classes.topContentWrapper}>
        <Container maxWidth="lg">

          {/* Always line break before 'and datasets' because it scans better */}
          <Typography variant="h1" className={classes.topHeaderTitle}>
            Dojo helps researchers share their models <br />and datasets
          </Typography>
          <Typography variant="h6" className={classes.topHeaderSubtitle}>
            Create containerized, shareable models for reproducible research with easy-to-consume
            outputs. Register and transform datasets for use in downstream modeling workflows.
          </Typography>
          <div className={classes.linksWrapper}>
            <Typography variant="h4" align="center" className={classes.linkCta}>
              Get started <ArrowForwardIcon fontSize="large" />
            </Typography>
            <div className={classes.links}>
              {loggedIn ? (
                <>
                  <Button
                    component={RouterLink}
                    color="inherit"
                    data-test="landingPageModelForm"
                    to="/model"
                    variant="contained"
                    disableElevation
                    size="large"
                    endIcon={<ComputerIcon />}
                    className={classes.button}
                  >
                    Register a Model
                  </Button>

                  <Button
                    component={RouterLink}
                    variant="contained"
                    color="inherit"
                    to="/datasets/register"
                    disableElevation
                    size="large"
                    endIcon={<AssessmentIcon />}
                    className={classes.button}
                  >
                    Register a Dataset
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    color="inherit"
                    // eslint-disable-next-line no-alert
                    onClick={() => alert('This feature has not been implemented yet.')}
                    disableElevation
                    size="large"
                    className={classes.button}
                  >
                    Create an account
                  </Button>
                  <Button
                    variant="contained"
                    color="inherit"
                    // eslint-disable-next-line no-alert
                    onClick={() => alert('This feature has not been implemented yet.')}
                    disableElevation
                    size="large"
                    className={classes.button}
                  >
                    Log In
                  </Button>
                </>
              )}
            </div>
          </div>
        </Container>
      </div>
      <div className={classes.bottomContentWrapper}>
        <Container maxWidth="lg" className={classes.bottomContentContainer}>
          {loggedIn ? (
            <div className={classes.linksWrapper}>
              {/* specific top margin to center this on the existing model text */}
              <Typography
                variant="h4"
                align="center"
                className={classes.linkCta}
                style={{ marginTop: '50px' }}
              >
                Or continue <ArrowForwardIcon fontSize="large" />
              </Typography>
              <div className={classes.links}>
                <div>
                  <ComputerIcon className={classes.bigIcon} />
                  <Typography
                    component={RouterLink}
                    to="/models"
                    variant="h5"
                    className={classes.link}
                  >
                    View existing models
                  </Typography>
                  <Typography variant="subtitle1">
                    Browse {
                      modelsLoading || modelsError ? 'all' : <b>{models?.hits}</b>
                    } registered models
                  </Typography>
                </div>
                <div>
                  <AssessmentIcon className={classes.bigIcon} />
                  <Typography
                    component={RouterLink}
                    to="/datasets"
                    variant="h5"
                    className={classes.link}
                  >
                    View existing datasets
                  </Typography>
                  <Typography variant="subtitle1">
                    Browse all registered datasets
                  </Typography>
                </div>
                <div>
                  <LoopIcon className={classes.bigIcon} />
                  <Typography
                    component={RouterLink}
                    to="/runs"
                    variant="h5"
                    className={classes.link}
                  >
                    View existing model runs
                  </Typography>
                  <Typography variant="subtitle1">
                    Browse {
                      runsLoading || runsError ? 'all' : <b>{runs?.hits}</b>
                    } existing model runs
                  </Typography>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <img
                src="./assets/terminal-screenshot.png"
                alt="Terminal Emulator Page"
                height="450"
                style={{ borderRadius: '16px' }}
              />
            </div>
          )}
          <div className={loggedIn ? classes.learnMoreLoggedIn : classes.learnMoreLoggedOut}>
            <Typography variant="h6" component="div" gutterBottom>
              Learn more about Dojo
            </Typography>
            <div className={classes.links}>
              <div>
                <MenuBookIcon fontSize="large" />
                <Typography
                  component={Link}
                  href="https://www.dojo-modeling.com"
                  target="_blank"
                  variant="h6"
                  className={classes.link}
                >
                  Check out the docs
                </Typography>
              </div>
              <div>
                <GitHubIcon fontSize="large" />
                <Typography
                  component={Link}
                  href="https://github.com/dojo-modeling"
                  target="_blank"
                  variant="h6"
                  className={classes.link}
                >
                  Check out Dojo on GitHub
                </Typography>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
};

export default LandingPage;
