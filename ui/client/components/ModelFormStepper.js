import React, { useCallback } from 'react';

import Button from '@material-ui/core/Button';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Stepper from '@material-ui/core/Stepper';
import Typography from '@material-ui/core/Typography';

import { v4 as uuidv4 } from 'uuid';

import { makeStyles } from '@material-ui/core/styles';
import { useHistory } from 'react-router-dom';

import { ModelDetail } from './ModelDetailForm';
import { ModelOverview } from './ModelOverviewForm';
import ModelRegionForm from './ModelRegionForm';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  instructions: {
    margin: [[theme.spacing(1), 0]],
  },
  form: {
    margin: [[theme.spacing(3), 0]],
  },
  button: {
    marginTop: theme.spacing(2),
  },
}));

function getSteps() {
  return ['Model Overview', 'Model Details', 'Model Geography'];
}

function getStepContent(step) {
  switch (step) {
    case 0:
      return 'Provide model overview';
    case 1:
      return 'Provide model specifics';
    case 2:
      return 'Provide model geographic coverage';
    default:
      return 'Unknown step';
  }
}

const defaultModelState = {
  name: '',
  family_name: '',
  description: '',
  type: 'model',
  category: [],
  geography: {},
  // this is just to store the selected regions from the final step
  // so we don't lose the them if the user goes back a step
  selectedRegions: [],
  storedCoords: [],
  outputs: [],
  parameters: [],
  image: '',
  stochastic: 'true',
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
      const modelResp = await fetch(`/api/dojo/models/${parsedModelInfo.id}`);
      if (modelResp.ok) {
        // TODO update modelInfo context
        history.push(`/intro/${parsedModelInfo.id}`);
      }
    }
  } catch (e) {
    console.log('error!...');
    console.log(e);
  }
};

export const HorizontalLinearStepper = () => {
  const history = useHistory();
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  // deep clone the defaultModelState object so we don't just reference it
  // and thus break the 'reset' button at the end of the flow
  const [modelInfo, setModelInfo] = React.useState(
    JSON.parse(JSON.stringify(defaultModelState))
  );
  const steps = getSteps();

  const handleBack = (values) => {
    setModelInfo((prevValues) => ({ ...prevValues, ...values }));
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

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  }, [activeStep, history]);

  const handleReset = () => {
    setModelInfo(JSON.parse(JSON.stringify(defaultModelState)));
    setActiveStep(0);
  };

  const displayFormStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <ModelOverview
            handleNext={handleNext}
            modelInfo={modelInfo}
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
            handleBack={handleBack}
            storedRegions={modelInfo.selectedRegions}
            storedCoords={modelInfo.storedCoords}
          />
        );
      default:
        return (<div>error</div>);
    }
  };

  return (
    <div className={classes.root}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => {
          const stepProps = {};
          return (
            <Step key={label} completed={stepProps.completed}>
              <StepLabel>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <div>
        {activeStep === steps.length ? (
          <div>
            <Typography className={classes.instructions}>
              All steps completed - you&apos;re finished
            </Typography>
            <Button onClick={handleReset} className={classes.button}>
              Reset
            </Button>
          </div>
        ) : (
          <div>
            <div className={classes.form}>
              <Typography
                align="center"
                className={classes.instructions}
                variant="h5"
              >
                {getStepContent(activeStep)}
              </Typography>
              {displayFormStep()}
            </div>
            <div />
          </div>
        )}
      </div>
    </div>
  );
};
