import React from 'react';

import AppBar from '@material-ui/core/AppBar';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CloseIcon from '@material-ui/icons/Close';
import Dialog from '@material-ui/core/Dialog';
import IconButton from '@material-ui/core/IconButton';
import Slide from '@material-ui/core/Slide';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
}));

/* eslint-disable-next-line react/jsx-props-no-spreading */
const Transition = React.forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);

const FullScreenDialog = ({
  open, setOpen, onSave, children, title, showSave
}) => {
  const saveVisible = showSave !== false;
  const classes = useStyles();
  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    // let the onSave() handler decide whether we close this FullScreenDialog window
    const shouldClose = onSave();

    setOpen(!shouldClose);
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={Transition}>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            aria-label="close"
            color="inherit"
            data-test="fullScreenDialogCloseBtn"
            edge="start"
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            {title || ''}
          </Typography>
          <Button
            autoFocus
            color="inherit"
            data-test="fullScreenDialogSaveBtn"
            onClick={handleSave}
            style={{ display: saveVisible ? 'unset' : 'none' }}
          >
            save
          </Button>
        </Toolbar>
      </AppBar>
      <Box>
        {children}
      </Box>
    </Dialog>
  );
};

export default FullScreenDialog;
