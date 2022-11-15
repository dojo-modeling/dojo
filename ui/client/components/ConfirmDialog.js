import React, { useState } from 'react';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import LinearProgress from '@material-ui/core/LinearProgress';
import WarningIcon from '@material-ui/icons/Warning';

const ConfirmDialog = ({
  open, accept, reject, title, body
}) => {
  const [isClosing, setClosing] = useState(false);
  const handleClose = (event, reason, shouldClose) => {
    // if we're in the process of closing, don't close the dialog

    if (isClosing) return;

    // only confirm if the YES button is clicked, never for any other reason
    if (shouldClose) {
      setClosing(true);
      accept();
    } else {
      reject();
    }
  };

  return (
    <div>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <WarningIcon style={{ fontSize: '1.0rem', marginRight: '8px' }} />
          {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="alert-dialog-description"
            style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            {body}
          </DialogContentText>
          {isClosing && (
            <div style={{ height: '20px' }}>
              <LinearProgress color="primary" />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleClose(null, 'buttonClick', true)}
            color="primary"
            disabled={isClosing}
            data-test="confirmDialogYes"
          >
            Yes
          </Button>
          <Button
            onClick={() => handleClose(null, 'buttonClick', false)}
            autoFocus
            color="secondary"
            disabled={isClosing}
            data-test="confirmDialogNo"
          >
            No
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ConfirmDialog;
