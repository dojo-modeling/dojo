import React from 'react';

import Typography from '@material-ui/core/Typography';

import Drawer from '../Drawer';
import RunnerForm from './RunnerForm';

const RunnerDrawer = ({
  formOpen,
  onClose,
  onSubmit,
  parameters,
}) => {
  const handleSubmit = (values) => {
    onSubmit(values);
    onClose();
  };

  return (
    <Drawer
      open={formOpen}
      onClose={() => onClose()}
      variant="temporary"
      anchor="right"
      noConfirm
    >
      <Typography align="center" variant="h6">
        New Model Run Parameters
      </Typography>
      <Typography align="center" variant="subtitle1">
        Create a new model run using the following parameters.
      </Typography>
      {/* Skip render if parameters don't exist yet */}
      {(parameters !== undefined && parameters !== null) && (
        <RunnerForm
          handleSubmit={handleSubmit}
          parameters={parameters}
        />
      )}
    </Drawer>
  );
};

export default RunnerDrawer;
