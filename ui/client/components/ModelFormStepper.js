import React, { useCallback, useEffect, useState } from 'react';

import Button from '@material-ui/core/Button';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Stepper from '@material-ui/core/Stepper';
import Typography from '@material-ui/core/Typography';

import { v4 as uuidv4 } from 'uuid';

import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';

import { makeStyles } from '@material-ui/core/styles';
import { useHistory } from 'react-router-dom';

import BasicAlert from './BasicAlert';
import ConfirmDialog from './ConfirmDialog';
import { ModelDetail } from './ModelDetailForm';
import { ModelOverview } from './ModelOverviewForm';
import ModelRegionForm from './ModelRegionForm';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    position: 'relative'
  },
  instructions: {
    margin: [[theme.spacing(1), 0]],
  },
  form: {
    margin: [[theme.spacing(3), 0]],
  },
  resetButton: {
    position: 'absolute',
    // very specific positioning to line this up with the stepper
    top: '31px',
    left: '24px',
    opacity: 0.6,
    '&:hover': {
      opacity: 1,
    },
  },
  buttonOverride: {
    height: '20px',
  },
  stepperWrapper: {
    width: '85%',
    margin: '0 auto',
  },
}));

function getSteps() {
  return ['Model Overview', 'Model Details', 'Model Geography'];
}

const defaultModelState = {
  name: '',
  family_name: '',
  description: '',
  type: 'model',
  category: [],
  domains: [],
  geography: {},
  // this is just to store the selected regions from the final step
  // so we don't lose the them if the user goes back a step
  selectedRegions: [],
  storedCoords: [],
  outputs: [],
  parameters: [],
  image: '',
  maintainer: {
    email: '',
    name: '',
    website: 'https://github.com/jataware/dummy-model',
    organization: '',
  },
  period: {
    // model coverage start date
    gte: null,
    // model coverage end date
    lte: null,
  },
};

const createModel = async (model, history) => {
  // create a new object without the attributes we use for display
  const {
    selectedRegions,
    storedCoords,
    // and remove the 'period' that uses JS Date objects
    period,
    ...parsedModelInfo
  } = model;
  // instead we want the epoch value for the start and end dates
  parsedModelInfo.period = {
    gte: model.period.gte?.valueOf(),
    lte: model.period.lte?.valueOf(),
  };
  // then add in an ID
  parsedModelInfo.id = uuidv4();

  const settings = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parsedModelInfo)
  };

  try {
    console.log('submitted model:', parsedModelInfo);
    const resp = await fetch('/api/dojo/models', settings);
    if (resp.ok) {
      localStorage.removeItem('modelInfo');
      localStorage.removeItem('modelStep');
      const modelResp = await fetch(`/api/dojo/models/${parsedModelInfo.id}`);
      if (modelResp.ok) {
        history.push(`/provision/${parsedModelInfo.id}`);
      }
    }
  } catch (e) {
    console.log('error!...');
    console.log(e);
  }
};

export const HorizontalLinearStepper = ({ modelFamily }) => {
  const history = useHistory();
  const classes = useStyles();
  const [lockFamilyName, setLockFamilyName] = useState(false);
  const [activeStep, setActiveStep] = React.useState(() => {
    // put us back to wherever we left off, if localstorage has a modelStep
    const savedStep = localStorage.getItem('modelStep');
    // eslint-disable-next-line radix
    return Number.parseInt(savedStep) || 0;
  });
  const [completedSteps, setCompletedSteps] = React.useState({});
  const [revisitedFormAlert, setRevisitedFormAlert] = useState(false);
  const [resetAlert, setResetAlert] = useState(false);
  const [resetFirstForm, setResetFirstForm] = useState(false);

  const [modelInfo, setModelInfo] = React.useState(() => {
    // fetch the saved model from localStorage if it's there
    const savedModel = localStorage.getItem('modelInfo');
    const parsedModel = JSON.parse(savedModel);

    // if the model from localStorage isn't the default, show the revisited alert
    if (parsedModel && !isEqual(parsedModel, defaultModelState)) {
      setRevisitedFormAlert(true);
    }
    // and if it isn't, return a deep cloned copy of our default model
    return parsedModel || cloneDeep(defaultModelState);
  });

  useEffect(() => {
    if (modelFamily) {
      setModelInfo((prevModelInfo) => ({ ...prevModelInfo, family_name: modelFamily }));
      setLockFamilyName(true);
    }
  }, [modelFamily]);

  const steps = getSteps();

  const handleBack = (values) => {
    if (values) {
      setModelInfo((prevValues) => ({ ...prevValues, ...values }));
    }
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleNext = useCallback((values) => {
    setModelInfo((prevValues) => {
      const updatedModel = { ...prevValues, ...values };
      if (activeStep === 2) {
        // call createModel here to avoid async issues with modelInfo state
        createModel(updatedModel, history);
      }
      return updatedModel;
    });

    setCompletedSteps((prevCompleted) => ({ ...prevCompleted, [activeStep]: true }));
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  }, [activeStep, history]);

  // when "yes" is clicked in the confirm reset dialog
  const acceptReset = () => {
    // we need to manually force the first form to reset
    if (activeStep === 0) {
      setResetFirstForm(true);
    }
    setModelInfo(cloneDeep(defaultModelState));
    // all the others will reset by default - we unmount them by going back to the first step
    setActiveStep(0);
    setCompletedSteps({});
    setResetAlert(false);
  };

  // when the reset button is clicked
  const handleResetClick = () => {
    // hide this if it's still showing
    setRevisitedFormAlert(false);
    setResetAlert(true);
  };

  const displayFormStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <ModelOverview
            handleNext={handleNext}
            modelInfo={modelInfo}
            lockFamilyName={lockFamilyName}
            resetFirstForm={resetFirstForm}
            setResetFirstForm={setResetFirstForm}
          />
        );
      case 1:
        return (
          <ModelDetail
            steps={steps}
            activeStep={activeStep}
            handleBack={handleBack}
            handleNext={handleNext}
            modelInfo={modelInfo}
          />
        );
      case 2:
        return (
          <ModelRegionForm
            handleNext={handleNext}
            setModelInfo={setModelInfo}
            handleBack={handleBack}
            storedRegions={modelInfo.selectedRegions}
            storedCoords={modelInfo.storedCoords}
          />
        );
      default:
        setActiveStep(0);
    }
  };

  return (
    <div className={classes.root}>
      <Button
        variant="outlined"
        color="secondary"
        disableElevation
        onClick={handleResetClick}
        className={classes.resetButton}
        size="small"
        classes={{ outlinedSizeSmall: classes.buttonOverride }}
        data-test="stepperResetButton"
      >
        Reset
      </Button>
      <div className={classes.stepperWrapper}>
        <Stepper activeStep={activeStep}>
          {steps.map((label, index) => (
            <Step key={label} completed={completedSteps[index] || index < activeStep}>
              <StepLabel>
                <Typography variant="h5">
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
      <div>
        {activeStep === steps.length ? (
          <div>
            <Typography className={classes.instructions}>
              All steps completed - you&apos;re finished
            </Typography>
          </div>
        ) : displayFormStep()}
      </div>

      <BasicAlert
        alert={{
          message: `
            Continuing from where you left off.
            If you'd prefer to start again, click the reset button.`,
          severity: 'info',
        }}
        action={(
          <Button
            onClick={handleResetClick}
            color="inherit"
            size="small"
            variant="outlined"
          >
            Reset
          </Button>
        )}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        visible={revisitedFormAlert}
        setVisible={setRevisitedFormAlert}
      />
      {resetAlert && (
        <ConfirmDialog
          open={resetAlert}
          accept={acceptReset}
          reject={() => setResetAlert(false)}
          title="Are you sure you want to reset the model form?"
          body="This will delete the model metadata you've entered so far."
        />

      )}
    </div>
  );
};
