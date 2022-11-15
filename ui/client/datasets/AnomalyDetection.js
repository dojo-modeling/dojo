import React, { useEffect, useState } from 'react';
import clsx from 'clsx';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

import { withStyles } from '@material-ui/core/styles';

import axios from 'axios';
import { Navigation } from '.';

const mapConfidenceMessage = {
  low: 'File looks good!',
  medium: 'File might have problems.',
  high: 'File will probably have problems.'
};

const RunJob = withStyles(({ spacing }) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    height: '100%',
    padding: [[0, spacing(4), spacing(2), spacing(4)]],
  },
  header: {
  },
  loadingWrapper: {
    display: 'flex',
    flex: '1 1 10rem',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',

    '@media (min-height: 700px)': {
      marginTop: '-15%'
    }

  },
  spinner: {
    backgroundImage: "url('/assets/anomaly.gif')",
    backgroundPosition: 'center',
    backgroundSize: '200%',
    backgroundRepeat: 'no-repeat',
    width: 200,
    height: 200,
    opacity: 0.7
  },
  riskResult: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  risklow: {
    color: 'rgba(0,255,0,0.4)',
  },
  riskmedium: {
    color: 'rgba(255,255,0,0.4)',
  },
  riskhight: {
    color: 'rgba(255,0,0,0.4)',
  },
}))(({
  classes, datasetInfo, setDatasetInfo, stepTitle, handleNext, handleBack, job_id, ...props
}) => {
  const [jobData, setJobData] = useState(null);

  const updateJobData = () => {
    const url = `/api/dojo/job/${datasetInfo.id}/${job_id}`;
    console.log(url);
    axios({
      method: 'post',
      url,
      data: props?.args || {},
    }).then((response) => {
      setJobData(response.data);
    });
  };

  useEffect(() => {
    if (jobData === null) {
      // Run right away on page load
      updateJobData();
    } else if (jobData.status == 'finished') {
      console.log('done');

      // setJobData(null);
      // handleNext();
    } else if (jobData.status == 'failed') {
      console.log('failed');
    } else {
      setTimeout(updateJobData, 1500);
    }
  }, [jobData]);

  return (
    <Container
      className={classes.root}
      component="main"
      maxWidth="lg"
    >
      <div className={classes.loadingWrapper}>
        <Typography
          className={classes.header}
          variant="h4"
          align="center"
          color="textSecondary"
        >
          {stepTitle}
        </Typography>
          &nbsp;
        {
            jobData?.result ? (
              <div className={clsx([
                classes.riskResult,
                classes[`risk${jobData?.result?.anomalyConfidence}`]
              ])}
              >
                <img src={`data:image/png;base64,${jobData.result.img}`} />
                <Typography variant="subtitle1">
                  {mapConfidenceMessage[jobData.result.anomalyConfidence]}
                </Typography>
              </div>
            ) : (
              <>
                <div className={classes.spinner} />
                <br />
                <Typography variant="caption">
                  Scanning file blocks, analyzing whitespace, string, and numeric data for viability.
                </Typography>
                {/* <Typography style={{ textTransform: 'capitalize' }}>
                  {jobData?.status}
                </Typography> */}
              </>
            )
          }
      </div>

      {/* Temporary for navigation testing. Should auto-go to next when complete. */}
      <Navigation
        handleNext={() => { setJobData(null); handleNext(); }}
        handleBack={handleBack}
      />
    </Container>
  );
});
export default RunJob;
