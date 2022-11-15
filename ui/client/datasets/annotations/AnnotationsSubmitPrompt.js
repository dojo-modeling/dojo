import React from 'react';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';
import isEmpty from 'lodash/isEmpty';
import { withStyles } from '@material-ui/core/styles';

/**
 *
 * */
export default withStyles(() => ({
}))(({
  open, warnings = [], errors = [], onAccept, onDecline
}) => (
  <Dialog
    open={open}
  >
    <DialogTitle>
      Please Review
    </DialogTitle>

    <DialogContent>
      <DialogContentText component="div">

        {!isEmpty(warnings) && (
        <>
          <Typography variant="h6">Optional</Typography>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
        )}

        {!isEmpty(errors) && (
        <>
          <Typography variant="h6">Required</Typography>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <p>
            Annotate required items in order to proceed.
          </p>
        </>
        )}

      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button
        onClick={onDecline}
      >
        Make Changes
      </Button>
      {isEmpty(errors) && (
      <Button
        onClick={onAccept}
        color="primary"
      >
        Continue to Preview
      </Button>
      )}
    </DialogActions>
  </Dialog>
));
