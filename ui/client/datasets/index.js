import React from 'react';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';

/**
 *
 * */
export const Navigation = withStyles(({ spacing }) => ({
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: spacing(2)
  },
}))(({
  classes, handleNext, handleBack, label, disabled, ...props
}) => (
  <div className={classes.buttonContainer}>
    <Button
      onClick={handleBack}
      disabled={disabled}
    >
      Back
    </Button>
    <Button
      color="primary"
      variant="contained"
      disableElevation
      disabled={disabled}
      onClick={() => {handleNext({handleNext, ...props})}}
    >
      {label || 'Next'}
    </Button>
  </div>
));
