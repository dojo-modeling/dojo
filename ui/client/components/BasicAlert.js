import React from 'react';

import MuiAlert from '@material-ui/lab/Alert';
import Snackbar from '@material-ui/core/Snackbar';

const BasicAlert = ({
  alert, visible, setVisible, ...props
}) => {
  const { message, severity } = alert;

  const handleAlertClose = async () => {
    setVisible(false);
  };

  return (
    <Snackbar open={visible} autoHideDuration={6000} onClose={handleAlertClose} {...props}>
      <MuiAlert elevation={6} variant="filled" severity={severity}>
        {message}
      </MuiAlert>
    </Snackbar>
  );
};

export default BasicAlert;
