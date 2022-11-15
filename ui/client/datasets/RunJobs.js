import React, { useEffect, useState } from 'react';

import { CircularProgress } from '@material-ui/core';
import Chip from '@material-ui/core/Chip';
import Container from '@material-ui/core/Container';
import FailedIcon from '@material-ui/icons/Clear';
import Typography from '@material-ui/core/Typography';

import { withStyles } from '@material-ui/core/styles';

import axios from 'axios';
import { Navigation } from '.';

import { useLocation } from 'react-router-dom';

const RunJobs = withStyles(({ spacing }) => ({
  root: {
    display: 'flex',
    padding: [[0, spacing(4), spacing(2), spacing(4)]],
    flexDirection: 'column',
    flex: 1,
    height: '100%'
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
  failedIcon: {
    fontSize: '9rem',
    opacity: 0.5
  },
  failedChipMessage: {
    borderBottom: '1px solid gray',
    marginBottom: '0.75rem'
  },
  preformattedOutput: {
    width: '75%',
    padding: '1.25rem',
    background: '#DDDDDD44',
    overflow: 'auto',
    maxHeight: '30%'
  }
}))(({
  classes, datasetInfo, setDatasetInfo, stepTitle, annotations, setAnnotations,
  handleNext, handleBack, jobs, rawFileName, ...props
}) => {
  // Don't proceed if we don't have a job set.
  if (jobs === null) {
    return null;
  }

  const [jobData, setJobData] = useState(null);
  const [jobIndex, setJobIndex] = useState(0);

  const updateJobData = ({firstRun, ...args} = {}) => {
    const job = jobs[jobIndex];
    // const job_id = job.id;
    const url = `/api/dojo/job/${datasetInfo.id}/${job.id}`;
    let context;
    if (job.send_context) {
      context = {
        uuid: datasetInfo.id,
        dataset: datasetInfo,
        annotations: annotations,
      }
    }
    const payload = {
      context: context,
      ...job.args,
      filename: rawFileName,
      force_restart: firstRun,
    }
    axios({
      method: 'post',
      url,
      data: payload,
    }).then((response) => {
      setJobData(response.data);
    }); // TODO catch , finally
  };

  useEffect(() => {

    let timeoutHandle;

    if (!(datasetInfo?.id)) {
      return null;
    }

    if (jobData === null) {
      // Run right away on page load
      updateJobData({firstRun: true});
    } else if (jobData.status === 'finished') {
      const newJobIndex = jobIndex + 1;
      const job = jobs[jobIndex];
      if (job.handler) {
        job.handler({
          result: jobData.result,
          job,
          rawFileName,
          datasetInfo,
          setDatasetInfo,
          annotations,
          setAnnotations,
          ...props
        });
      }
      if (newJobIndex < jobs.length) {
        setJobIndex(newJobIndex);
        setJobData(null);
      } else {
        handleNext({});
      }
    } else if (jobData.status == 'failed') {
      console.log('failed');
    } else {
      // No result, wait for an update
      timeoutHandle = setTimeout(updateJobData, 500);
    }

    // Clean up timeout each time we're done
    // Crucially important on the last time we run into between unmounting
    //  (eg navigating out of RunJob page by pressing back button)
    //  in order to remove the setTimeout and updateJobData fn invocation.
    return function cleanup() {
        clearTimeout(timeoutHandle);
    };
  }, [jobData, datasetInfo.id]);

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
        >
          {stepTitle}
        </Typography>
          &nbsp;

        {jobData?.status !== 'failed' ? (
          <CircularProgress />
        ) : (
          <>
            <FailedIcon
              color="secondary"
              className={classes.failedIcon} />

            <Chip
              className={classes.failedChipMessage}
              label="FAILED" />

            <pre className={classes.preformattedOutput}>
              {jobData.errorDisplay || jobData.job_error}
            </pre>
          </>
        )}

      </div>

      {/* TODO NOTE Temporary for navigation testing. Should auto-go to next when complete. */}
      <Navigation
        handleNext={null}
        handleBack={handleBack}
      />
    </Container>
  );
});
RunJobs.SKIP = true; // TODO probably set within flow descriptor object in Flows.js
export default RunJobs;
