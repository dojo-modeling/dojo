import React, { useEffect, useState } from 'react';

import Typography from '@material-ui/core/Typography';

import { withStyles } from '@material-ui/core/styles';

import ConfirmDialog from '../ConfirmDialog';
import Drawer from '../Drawer';
import TemplaterForm from './TemplaterForm';

const TemplaterDrawer = withStyles((theme) => ({
  highlight: {
    backgroundColor: theme.palette.grey[200],
    borderRadius: theme.shape.borderRadius,
    margin: [[0, theme.spacing(2)]],
  },
}))(({
  classes,
  formOpen,
  onClose,
  currentHighlight,
  onSubmit,
  initialValues,
  handleDelete,
  isMoving,
  modelId,
  highlights,
  content,
  mode,
}) => {
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [disableConfirm, setDisableConfirm] = useState(true);

  useEffect(() => {
    if (!formOpen) {
      // when the form closes, set us back to not showing the drawer's confirm on close
      setDisableConfirm(true);
    }
  }, [formOpen]);

  const handleSubmit = (values) => {
    onSubmit(values);
    onClose();
  };

  const confirmDelete = () => {
    handleDelete(currentHighlight);
    setConfirmDeleteDialogOpen(false);
  };

  return (
    /* Don't unmount the drawer or we'll lose its slide animation */
    <Drawer
      open={formOpen}
      onClose={() => onClose()}
      variant="temporary"
      noConfirm={disableConfirm}
    >
      <Typography align="center" variant="h6">
        Annotate Your Parameter:
      </Typography>
      <Typography
        variant="subtitle1"
        align="center"
        className={classes.highlight}
        gutterBottom
      >
        {currentHighlight?.text}
      </Typography>
      {/* Fully unmount the form to clear the Formik state */}
      {formOpen && (
        <TemplaterForm
          setDisableConfirm={setDisableConfirm}
          handleSubmit={handleSubmit}
          initialValues={initialValues}
          isMoving={isMoving}
          setConfirmDeleteDialogOpen={setConfirmDeleteDialogOpen}
          modelId={modelId}
          currentHighlight={currentHighlight}
          highlights={highlights}
          content={content}
          mode={mode}
        />
      )}
      <ConfirmDialog
        open={confirmDeleteDialogOpen}
        accept={confirmDelete}
        reject={() => setConfirmDeleteDialogOpen(false)}
        title="Delete this annotated parameter?"
        body="Are you sure you want to permanently delete this parameter?"
      />
    </Drawer>
  );
});

export default TemplaterDrawer;
