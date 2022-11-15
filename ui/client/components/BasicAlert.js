import React from 'react';

import MuiAlert from '@material-ui/lab/Alert';
import Snackbar from '@material-ui/core/Snackbar';

const BasicAlert = ({
  alert, visible, setVisible, action, disableClickaway, ...props
}) => {
  const { message, severity } = alert;

  const handleAlertClose = (event, reason) => {
    // disable clicking outside the alert to close it
    if (disableClickaway && (reason === 'clickaway')) {
      return;
    }

    setVisible(false);
  };

  // autoHideDuration={null} passed as a prop will work to keep BasicAlert open forever
  return (
    <Snackbar open={visible} autoHideDuration={6000} onClose={handleAlertClose} {...props}>
      <MuiAlert elevation={6} variant="filled" severity={severity} action={action}>
        {message}
      </MuiAlert>
    </Snackbar>
  );
};

export default BasicAlert;
