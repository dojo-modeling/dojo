import React from 'react';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function DeletionDialog({
  itemDescr, deletionHandler, open, handleDialogClose
}) {
  return (
    <Dialog
      open={open}
    >
      <DialogTitle>Are you sure you want to delete this item?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {itemDescr}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose}>No</Button>
        <Button onClick={(event) => { deletionHandler(event); handleDialogClose(event); }}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
