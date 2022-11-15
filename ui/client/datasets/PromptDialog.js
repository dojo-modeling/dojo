import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default ({
  open, title, message, handleClose
}) => (
  <Dialog
    open={open}
    onClose={handleClose}
  >
    <DialogTitle>
      {title}
    </DialogTitle>
    <DialogContent>
      <DialogContentText>
        {message}
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={handleClose} color="primary">
        Ok
      </Button>
    </DialogActions>
  </Dialog>
);
