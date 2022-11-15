import React, { useContext, useEffect, useState } from 'react';

import axios from 'axios';

import Fab from '@material-ui/core/Fab';
import Grid from '@material-ui/core/Grid';

import { makeStyles } from '@material-ui/core/styles';

import { useHistory, useParams } from 'react-router-dom';

import {
  WebSocketContextProvider,
} from './context';

import ConfirmDialog from './components/ConfirmDialog';
import ContainerWebSocket from './components/ContainerWebSocket';
import DirectiveBox from './components/DirectiveBox';
import FullScreenDialog from './components/FullScreenDialog';
import FullScreenTemplater from './components/templater/FullScreenTemplater';
import HelperTip from './components/HelperTip';
import LoadingOverlay from './components/LoadingOverlay';
import ModelFileTabs from './components/ModelFileTabs';
import ShellHistory from './components/ShellHistory';
import SimpleEditor from './components/SimpleEditor';
import Term from './components/Term';
import { ThemeContext } from './components/ThemeContextProvider';
import UploadFileDialog from './components/UploadFileDialog';
import {
  useLock, useModel, useOutputFiles
} from './components/SWRHooks';
import RegistrationStepper from './datasets/RegistrationStepper';

const useStyles = makeStyles((theme) => ({
  pageRoot: {
    backgroundColor: '#272d33',
  },
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
  rightColumnWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    paddingBottom: theme.spacing(3),
  },
  directiveContainer: {
    margin: [[0, 0, theme.spacing(1), theme.spacing(1)]],
  },
}));

const CenteredGrid = ({ model }) => {
  const classes = useStyles();

  const { mutateOutputs } = useOutputFiles(model.id);

  const [openAbandonSessionDialog, setAbandonSessionDialogOpen] = useState(false);
  const [editorContents, setEditorContents] = useState({});
  const [openEditor, setOpenEditor] = useState(false);
  const [isModelOutputOpen, setIsModelOutputOpen] = useState(false);
  const [annotationInfo, setAnnotationInfo] = useState({});
  const [modelOutputFile, setModelOutputFile] = useState('');
  const [openFileUploadDialog, setUploadFilesOpen] = useState(false);
  const [uploadPath, setUploadPath] = useState('');

  // opens the FullScreenTemplater where configs and directives are annotated
  const [templaterOpen, setTemplaterOpen] = useState(false);
  const [templaterContents, setTemplaterContents] = useState({});
  // modes: 'directive', 'config'
  const [templaterMode, setTemplaterMode] = useState({});

  const history = useHistory();

  const handleAbandonSession = () => {
    axios.delete(`/api/terminal/docker/${model.id}/release`).then(() => {
      history.push(`/summary/${model.id}`);
    }).catch((error) => {
      console.log('There was an error shutting down the container: ', error);
      setAbandonSessionDialogOpen(false);
    });
  };

  const saveEditor = async () => {
    await fetch(`/api/terminal/container/${model.id}/ops/save?path=${editorContents.file}`, {
      method: 'POST',
      body: editorContents.text
    });

    return true; // should close FullScreenDialog
  };

  const handleDirectiveClick = (directive) => {
    setTemplaterContents({
      editor_content: directive?.command,
      content_id: directive?.command,
      cwd: directive?.cwd,
      parameters: directive.parameters,
    });
    setTemplaterMode('directive');
    setTemplaterOpen(true);
  };

  useEffect(() => {
    // Listen to message from child window for modelOutput
    const handleEvent = (e) => {
      const key = e.message ? 'message' : 'data';
      const data = e[key];
      if (data === 'closeModelOutput') {
        setIsModelOutputOpen(false);
        // check for new modelOutput files, but wait 1s for elasticsearch to catch up
        setTimeout(() => mutateOutputs(), 1000);
      }
    };
    window.addEventListener('message', handleEvent);
    return () => {
      window.removeEventListener('message', handleEvent);
    };
  }, [mutateOutputs]);

  useEffect(() => {
    // Clear any shutdown timers for this model if we're coming back from the summary page
    // returns a 404 if there are none to cancel (if we aren't coming from summary)
    axios.delete(`/api/terminal/docker/${model.id}/shutdown`)
      .then(() => console.debug('Cancelling container auto-shutdown timer'))
      .catch(() => console.debug('No auto-shutdown timers found to cancel'));
  }, [model.id]);

  return (
    <div className={classes.pageRoot}>
      <Grid container spacing={1} style={{ width: 'auto', margin: 0 }}>
        <Grid item xs={7} xl={8} style={{ padding: '0 8px' }}>
          <Term />
        </Grid>

        <Grid item xs={5} xl={4} style={{ padding: '0 5px 0 0', zIndex: 5 }}>
          <div className={classes.rightColumnWrapper}>
            <ShellHistory
              modelId={model.id}
              setTemplaterOpen={setTemplaterOpen}
              setTemplaterContents={setTemplaterContents}
              setTemplaterMode={setTemplaterMode}
            />
            <ContainerWebSocket
              modelId={model.id}
              setEditorContents={setEditorContents}
              openEditor={() => setOpenEditor(true)}
              setTemplaterOpen={setTemplaterOpen}
              setTemplaterContents={setTemplaterContents}
              setTemplaterMode={setTemplaterMode}
              setIsModelOutputOpen={setIsModelOutputOpen}
              setAnnotationInfo={setAnnotationInfo}
              setModelOutputFile={setModelOutputFile}
              setUploadFilesOpen={setUploadFilesOpen}
              setUploadPath={setUploadPath}
            />
            <div className={classes.directiveContainer}>
              <DirectiveBox modelId={model.id} handleClick={handleDirectiveClick} />
            </div>

            <ModelFileTabs
              model={model}
              setTemplaterMode={setTemplaterMode}
              setTemplaterContents={setTemplaterContents}
              setTemplaterOpen={setTemplaterOpen}
              setModelOutputOpen={setIsModelOutputOpen}
              setModelOutputFile={setModelOutputFile}
            />
          </div>
        </Grid>
      </Grid>

      <div className={classes.fabWrapper}>
        <Fab
          variant="extended"
          color="secondary"
          onClick={(e) => { e.preventDefault(); setAbandonSessionDialogOpen(true); }}
        >
          <HelperTip
            title="Discard all of your work since launching the terminal.
              This will take you to your model's summary page."
          >
            Abandon Session
          </HelperTip>
        </Fab>

        <Fab
          data-test="terminalSaveButton"
          variant="extended"
          color="primary"
          onClick={() => history.push(`/summary/${model.id}?terminal=true`, { upload: true })}
        >
          <HelperTip
            title="Save your work and continue on to the Summary page, where your model will
              be uploaded to Docker Hub before you can publish."
          >
            Save and Continue
          </HelperTip>
        </Fab>

      </div>

      {templaterOpen && (
        <FullScreenTemplater
          modelId={model.id}
          content={templaterContents}
          open={templaterOpen}
          mode={templaterMode}
          setOpen={setTemplaterOpen}
        />
      )}

      <FullScreenDialog
        open={openEditor}
        setOpen={setOpenEditor}
        onSave={saveEditor}
        title={`Editing ${editorContents?.file}`}
      >
        <SimpleEditor editorContents={editorContents} setEditorContents={setEditorContents} />
      </FullScreenDialog>

      <FullScreenDialog
        open={isModelOutputOpen && (annotationInfo.hasOwnProperty('pattern'))}
        setOpen={() => {setIsModelOutputOpen(false)}}
        onSave={() => {}}
        showSave={false}
        title={`${modelOutputFile?.name || modelOutputFile}`}
      >
        <RegistrationStepper
          onSave={() => {setOpen(false)}}
          match={{
            params: {
              flowslug: "model",
              step: null,
              datasetId: null,
            }
          }}
          updateLocation={false}
          modelId={model.id}
          onSubmit={() => {
            setIsModelOutputOpen(false);
            mutateOutputs();
          }}
          {...annotationInfo}
        />
      </FullScreenDialog>
      <ConfirmDialog
        open={openAbandonSessionDialog}
        accept={handleAbandonSession}
        reject={() => { setAbandonSessionDialogOpen(false); }}
        title="Are you sure you want to abandon this session?"
        body="This will kill your terminal session and is not recoverable.
        Any unsaved changes will be lost."
      />
      { openFileUploadDialog
        && (
        <UploadFileDialog
          open={openFileUploadDialog}
          closeDialog={() => { setUploadFilesOpen(false); }}
          modelID={model.id}
          uploadPath={uploadPath}
        />
        )}
    </div>
  );
};

const Terminal = () => {
  const { modelid } = useParams();
  const worker = 0;

  // we only care if lock is loading or doesn't exist
  const { lockLoading, lockError } = useLock(modelid);
  const { model, modelLoading, modelError } = useModel(modelid);

  const { setShowNavBar } = useContext(ThemeContext);

  // do this before we show the loading overlay so we don't see a flicker of the navbar
  useEffect(() => {
    // hide the navbar when the component mounts
    setShowNavBar(false);
    // when the component unmounts, toggle the navbar back
    return () => setShowNavBar(true);
  }, [setShowNavBar]);

  let proto = 'ws:';
  if (window.location.protocol === 'https:') {
    proto = 'wss:';
  }
  const url = `${proto}//${window.location.host}/api/ws/${modelid}`;

  useEffect(() => {
    document.title = 'Terminal - Dojo';
  }, []);

  if (modelLoading || lockLoading) {
    return <LoadingOverlay text="Loading terminal" />;
  }

  if (modelError || lockError) {
    return (
      <LoadingOverlay
        text="There was an error loading the terminal"
        error={modelError || lockError}
        link={{
          text: 'Go to the model summary page',
          href: `/summary/${modelid}`
        }}
      />
    );
  }

  return (
    <WebSocketContextProvider url={url}>
      <CenteredGrid workerNode={worker} model={model} />
    </WebSocketContextProvider>
  );
};

export default Terminal;
