import React, { useState } from 'react';

import { withStyles } from '@material-ui/core/styles';

import CloseIcon from '@material-ui/icons/Close';
import Drawer from '@material-ui/core/Drawer';
import IconButton from '@material-ui/core/IconButton';

import ConfirmDialog from './ConfirmDialog';

export default withStyles(({ spacing }) => ({
  root: {
    width: '30%',
    minWidth: '20rem',
    padding: spacing(3)
  },
  drawerControls: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
}))(({
  anchorPosition,
  classes,
  children,
  confirmBody = 'Please confirm that you want to discard your changes.',
  confirmTitle = 'Are you sure you want to discard your work?',
  onClose,
  open,
  variant = 'persistent',
  noConfirm = false,
  ...props
}) => {
  const [confirmClose, setConfirmClose] = useState(false);

  const handleClose = (event) => {
    if (noConfirm) {
      // if we don't want a confirm dialog, don't prevent clicking outside to close
      // and just call our onClose function right away
      onClose(true);
      return;
    }

    // disable clicking outside the drawer to close for variant=temporary
    // instead relying on the close or X buttons (or noConfirm prop, as above)
    if (event.target.className === 'MuiBackdrop-root') {
      // MuiBackdrop-root only appears in the background for variant = temporary
      return;
    }

    setConfirmClose(true);
  };

  const handleConfirmedClose = () => {
    setConfirmClose(false);
    onClose(true);
  };

  return (
    <>
      <Drawer
        variant={variant}
        classes={{ paper: classes.root }}
        anchor={anchorPosition}
        open={open}
        onClose={handleClose}
        {...props}
      >
        <>
          <div className={classes.drawerControls}>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </div>
          {children}
        </>
      </Drawer>

      {/* unmount the dialog so we reset its state entirely
        otherwise it can get into a closing state if opened again */}
      {confirmClose && (
        <ConfirmDialog
          accept={handleConfirmedClose}
          body={confirmBody}
          open={confirmClose}
          reject={() => setConfirmClose(false)}
          title={confirmTitle}
        />
      )}
    </>
  );
});
