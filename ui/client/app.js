import React, { useState } from 'react';

import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Divider from '@material-ui/core/Divider';
import Fab from '@material-ui/core/Fab';
import Grid from '@material-ui/core/Grid';
import LinearProgress from '@material-ui/core/LinearProgress';
import SyncDisabledIcon from '@material-ui/icons/SyncDisabled';
import SyncIcon from '@material-ui/icons/Sync';
import WarningIcon from '@material-ui/icons/Warning';

import { makeStyles, useTheme } from '@material-ui/core/styles';

import { useHistory, useParams } from 'react-router-dom';

import {
  WebSocketContextProvider,
} from './context';

import DirectiveBox from './components/DirectiveBox';
import FullScreenDialog from './components/FullScreenDialog';
import LoadingOverlay from './components/LoadingOverlay';
import TemplaterEditor from './components/TemplaterEditor';
import SimpleEditor from './components/SimpleEditor';
import Term from './components/Term';
import { ContainerWebSocket, ShellHistory } from './components/ShellHistory';

import { useContainerWithWorker, useModel } from './components/SWRHooks';

const useStyles = makeStyles((theme) => ({
  connected: {
    color: 'green'
  },
  disconnected: {
    color: 'red'
  },
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
  },
  fabWrapper: {
    position: 'fixed',
    right: 0,
    bottom: 0,
    zIndex: 10,
    '& > *': {
      margin: [[0, theme.spacing(2), theme.spacing(2), 0]],
    },
  },
}));

export const AbandonSessionDialog = ({
  open, accept, reject
}) => {
  const [isClosing, setClosing] = useState(false);
  const handleClose = async (yes) => {
    if (yes) {
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
          Are you sure you want to abandon this session?
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
            This will kill your terminal session and is not recoverable
          </DialogContentText>
          <div style={{ height: '20px', display: (isClosing) ? 'unset' : 'none' }}>
            <LinearProgress color="primary" />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleClose(true)} autoFocus color="primary" disabled={isClosing}>
            Yes
          </Button>
          <Button onClick={() => handleClose(false)} color="secondary" disabled={isClosing}>
            No
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export const Footer = ({ wsConnected, socketIoConnected }) => {
  const classes = useStyles();
  const style = {
    footer: {
      width: '100%',
      bottom: 0,
      position: 'absolute'
    },
    icon: {
      fontSize: '1.0rem',
      verticalAlign: 'middle',
    },
    paper: {
      padding: '4px',
      backgroundColor: '#000',
      color: '#fff'
    }
  };

  return (
    <Container style={style.footer}>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Grid container justify="flex-start" spacing={2}>
            <Grid item>
              <span>Terminal: </span>
              {socketIoConnected
                ? <SyncIcon className={classes.connected} style={style.icon} />
                : <SyncDisabledIcon className={classes.disconnected} style={style.icon} /> }
            </Grid>
            <Grid item>
              <span>Socket: </span>
              {wsConnected
                ? <SyncIcon className={classes.connected} style={style.icon} />
                : <SyncDisabledIcon className={classes.disconnected} style={style.icon} /> }

            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

const CenteredGrid = ({ workerNode, model }) => {
  const theme = useTheme();
  const { container } = useContainerWithWorker(workerNode);

  const classes = useStyles();

  const [openAbandonSessionDialog, setAbandonSessionDialogOpen] = useState(false);

  const [editorContents, setEditorContents] = useState({});
  const [openEditor, setOpenEditor] = useState(false);
  const [isAnnotateOpen, setIsAnnotateOpen] = useState(false);
  const [annotateUrl, setAnnotateUrl] = useState('');
  const [annotateFile, setAnnotateFile] = useState('');

  // the following control the state of the TemplaterEditor
  // opens the FullScreenDialog that holds the templater iframe
  const [isTemplaterOpen, setIsTemplaterOpen] = useState(false);
  // triggers templater to save on click
  const [isTemplaterSaving, setIsTemplaterSaving] = useState(false);
  // loads contents into the templater iframe
  const [templaterContents, setTemplaterContents] = useState({});
  // modes: 'directive', 'config'
  const [templaterMode, setTemplaterMode] = useState({});

  const history = useHistory();

  const handleAbandonSession = async () => {
    // yolo
    fetch(`/api/terminal/docker/${workerNode}/stop/${container.id}`, { method: 'DELETE' });
    history.push('/');
  };

  const handleEndSession = () => {
    // go to summary screen
    history.push(`/summary?worker=${workerNode}`, container);
  };

  const templaterDialogOnSave = () => {
    // trigger TemplaterEditor to tell the templater app to save
    setIsTemplaterSaving(true);
    return false; // don't close FullScreenDialog
  };

  const saveEditor = async () => {
    await fetch(`/api/terminal/container/${workerNode}/ops/save?path=${editorContents.file}`, {
      method: 'POST',
      body: editorContents.text
    });

    await fetch(`/api/terminal/container/store/${container.id}/edits`, {
      method: 'PUT',
      body: JSON.stringify(editorContents)
    });
    return true; // should close FullScreenDialog
  };

  return (
    <div className={theme.root} style={{ backgroundColor: '#272d33' }}>
      <Grid container spacing={1} style={{ width: 'auto', margin: 0 }}>
        <Grid item xs={8} style={{ padding: '0 2px', backgroundColor: '#272d33' }}>
          <Term />
        </Grid>

        <Grid item xs={4} style={{ padding: '0 5px 0 0', zIndex: 5 }}>
          <ShellHistory
            container={container}
            setIsTemplaterOpen={setIsTemplaterOpen}
            setIsTemplaterSaving={setIsTemplaterSaving}
            setTemplaterContents={setTemplaterContents}
            setTemplaterMode={setTemplaterMode}
          />
          <ContainerWebSocket
            workerNode={workerNode}
            setEditorContents={setEditorContents}
            openEditor={() => setOpenEditor(true)}
            setIsTemplaterOpen={setIsTemplaterOpen}
            setIsTemplaterSaving={setIsTemplaterSaving}
            setTemplaterContents={setTemplaterContents}
            setTemplaterMode={setTemplaterMode}
            setIsAnnotateOpen={setIsAnnotateOpen}
            setAnnotateUrl={setAnnotateUrl}
            setAnnotateFile={setAnnotateFile}
          />
          <Divider />
          <DirectiveBox modelId={model.id} />

          <FullScreenDialog
            open={isTemplaterOpen}
            setOpen={setIsTemplaterOpen}
            onSave={templaterDialogOnSave}
          >
            <TemplaterEditor
              containerId={container?.id}
              modelInfo={model}
              isSaving={isTemplaterSaving}
              setIsSaving={setIsTemplaterSaving}
              mode={templaterMode}
              templaterContents={templaterContents}
              setIsTemplaterOpen={setIsTemplaterOpen}
            />
          </FullScreenDialog>

          <FullScreenDialog
            open={openEditor}
            setOpen={setOpenEditor}
            onSave={saveEditor}
            title={`Editing ${editorContents?.file}`}
          >
            <SimpleEditor editorContents={editorContents} setEditorContents={setEditorContents} />
          </FullScreenDialog>

          <FullScreenDialog
            open={isAnnotateOpen}
            setOpen={setIsAnnotateOpen}
            onSave={() => {}}
            showSave={false}
            title={`${annotateFile}`}
          >
            <iframe
              id="annotate"
              title="annotate"
              style={{ height: 'calc(100vh - 70px)', width: '100%' }}
              src={annotateUrl}
            />
          </FullScreenDialog>
        </Grid>
      </Grid>

      <div className={classes.fabWrapper}>
        <Fab
          variant="extended"
          color="secondary"
          onClick={(e) => { e.preventDefault(); setAbandonSessionDialogOpen(true); }}
        >
          Discard Session
        </Fab>

        <Fab
          data-test="terminalEndSessionBtn"
          variant="extended"
          color="primary"
          onClick={() => history.push(`/summary?worker=${workerNode}&save=true`)}
        >
          Save and Continue
        </Fab>
      </div>
      <AbandonSessionDialog
        open={openAbandonSessionDialog}
        accept={handleAbandonSession}
        reject={() => { setAbandonSessionDialogOpen(false); }}
      />
    </div>
  );
};

const App = () => {
  const { worker, modelid } = useParams();

  const { model, modelLoading, modelError } = useModel(modelid);

  let proto = 'ws:';
  if (window.location.protocol === 'https:') {
    proto = 'wss:';
  }
  const url = `${proto}//${window.location.host}/api/ws/${worker}`;

  if (modelLoading) {
    return <LoadingOverlay text="Loading terminal" />;
  }

  if (modelError) {
    return (
      <LoadingOverlay
        text="There was an error loading the terminal"
        error={modelError}
      />
    );
  }

  return (
    <WebSocketContextProvider url={url} autoConnect>
      <CenteredGrid workerNode={worker} model={model} />
    </WebSocketContextProvider>
  );
};

export default App;
