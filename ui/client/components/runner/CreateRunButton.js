import React, { useState } from 'react';

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';

import BasicAlert from '../BasicAlert';
import RunnerDrawer from './RunnerDrawer';
import { useParams } from '../SWRHooks';

const CreateRunButton = ({ model }) => {
  const { params } = useParams(model.id); // TODO: handle errors
  const [formOpen, setFormOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [runAlert, setRunAlert] = useState({
    message: 'none',
    severity: 'info',
  });
  const kickoffRun = (formValues) => {
    const runId = uuidv4();
    const payload = {
      id: runId,
      model_id: model.id,
      model_name: model.name,
      parameters: Object.entries(formValues).map(
        (entry) => ({ name: entry[0], value: String(entry[1]) })
      ),
      created_at: Date.now(),
      pre_gen_output_path: [],
      data_paths: [],
      tags: [],
      is_default_run: false,
    };

    axios.post('/api/dojo/runs', payload)
      .then((response) => {
        setRunAlert({
          message: `Created Run with the id '${runId}'.`,
          severity: 'success',
        });
        setAlertOpen(true);
        console.info(`Publishing succeeded with status ${response.status}`);
      })
      .catch((error) => {
        setRunAlert({
          message: `Failed to create new run with the id '${runId}'.`,
          severity: 'error',
        });
        setAlertOpen(true);
        console.error(`Run creation failed with: ${error}`);
      });
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setFormOpen(true)}
        disabled={formOpen}
        disableElevation
      >
        Create Model Run
      </Button>
      <RunnerDrawer
        formOpen={formOpen}
        onClose={() => setFormOpen(false)}
        parameters={params}
        onSubmit={kickoffRun}
        modelId={model.id}
      />
      <BasicAlert
        alert={runAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        visible={alertOpen}
        setVisible={setAlertOpen}
        autoHideDuration={null}
        action={(
          <IconButton
            color="inherit"
            onClick={() => setAlertOpen(false)}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      />
    </>
  );
};

export default CreateRunButton;
