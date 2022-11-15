import React, { useEffect, useState } from 'react';

import axios from 'axios';

import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Button from '@material-ui/core/Button';
import CheckIcon from '@material-ui/icons/Check';
import Container from '@material-ui/core/Container';
import Fab from '@material-ui/core/Fab';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { makeStyles, useTheme } from '@material-ui/core/styles';

import { Link, useHistory } from 'react-router-dom';

import BasicAlert from './BasicAlert';
import CreateRunButton from './runner/CreateRunButton';
import DirectiveBox from './DirectiveBox';
import EndSessionDialog from './EndSessionDialog';
import FileList from './FileList';
import FullScreenDialog from './FullScreenDialog';
import FullScreenTemplater from './templater/FullScreenTemplater';
import LoadingOverlay from './LoadingOverlay';
import { ModelSummaryEditor } from './ModelSummaryEditor';
import PublishContainer from '../publish_container';
import SimpleEditor from './SimpleEditor';
import SummaryAccessories from './SummaryAccessories';
import SummaryIntroDialog from './SummaryIntroDialog';
import SummaryModelDetails from './SummaryModelDetails';
import SummaryWebSocketHandler from './SummaryWebSocketHandler';
import ViewRuns from './ViewRuns';

import { useDirective } from './SWRHooks';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(2)]],
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing(3),
    paddingRight: theme.spacing(2),
  },
  detailsPanel: {
    backgroundColor: theme.palette.grey[300],
    padding: theme.spacing(2),
    borderRadius: '4px',
    borderWidth: 0,
    width: '100%',
    '&:focus': {
      outlineColor: '#fff',
      outlineWidth: 0,
      boxShadow: '0 0 10px #0c0c0c',
    },
  },
  runCommandContainer: {
    paddingBottom: theme.spacing(1),
  },
  headerText: {
    // this matches up with the headers in FileCardList
    paddingTop: '10px',
  },
  publishButton: {
    position: 'fixed',
    right: 0,
    bottom: '2px',
    zIndex: 10
  },
  modelEditButton: {
    float: 'right',
    backgroundColor: theme.palette.grey[400],
  },
  cardGridContainer: {
    '& > *': {
      height: '100%',
    },
  },
  runGridContainer: {
    paddingRight: '20%',
    paddingBottom: '3%',
  },
  tooltip: {
    marginBottom: theme.spacing(1),
  },
  publishedBox: {
    alignItems: 'center',
    backgroundColor: theme.palette.success.light,
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.success.contrastText,
    display: 'flex',
    padding: theme.spacing(1),
  },
}));

const SummaryContents = ({
  model, mutateModel, intro, locked, relaunch
}) => {
  const [introDialogOpen, setIntroDialogOpen] = useState(intro);
  // start the page disabled, as we need to wait for our lock API call to resolve before setting
  const [disabledMode, setDisabledMode] = useState(true);

  const [loadingMode, setLoadingMode] = useState(false);
  // when we're uploading the container to dockerhub
  const [uploading, setUploading] = useState(false);

  const history = useHistory();
  useEffect(() => {
    // if our call to the lock API confirmed the existence of a lock turn off disabledMode
    if (locked) {
      setDisabledMode(false);
    }

    // and if we passed along the upload state from the terminal, start the upload
    if (locked && history.location?.state?.upload) {
      setUploading(true);
    }
  }, [locked, history.location?.state]);

  const { directive } = useDirective(model.id);

  const [openEditor, setOpenEditor] = useState(false);
  const [editor, setEditor] = useState(() => ({
    text: '', file: ''
  }));

  const [templaterOpen, setTemplaterOpen] = useState(false);
  const [templaterContents, setTemplaterContents] = useState({});
  const [templaterMode, setTemplaterMode] = useState({});

  const [modelOutputOpen, setModelOutputOpen] = useState(false);
  const [modelOutputFile, setModelOutputFile] = useState();

  const [openModelEdit, setOpenModelEdit] = useState(false);

  // the two alerts on the page
  const [noDirectiveAlert, setNoDirectiveAlert] = useState(false);
  const [navigateAwayWarning, setNavigateAwayWarning] = useState(false);

  const [endSessionDialog, setEndSessionDialog] = useState(false);

  const classes = useStyles();
  const theme = useTheme();
  const mediumBreakpoint = useMediaQuery(theme.breakpoints.down('md'));

  const onUnload = (e) => {
    // preventDefault here triggers the confirm dialog
    e.preventDefault();

    // show the alert with our warning text, as we can't modify the confirm dialog text
    setNavigateAwayWarning(true);
  };

  // set up our confirm before navigating away warning
  useEffect(() => {
    // only show this if we haven't yet published and are editing OR are currently uploading
    if ((!disabledMode && !model.is_published) || uploading) {
      window.addEventListener('beforeunload', onUnload);
      return () => {
        window.removeEventListener('beforeunload', onUnload);
      };
    }
  }, [model.is_published, disabledMode, uploading]);

  const handlePublishClick = (e) => {
    e.preventDefault();

    if (!directive) {
      setNoDirectiveAlert(true);
      return;
    }
    setEndSessionDialog(true);
  };

  const saveEditor = async () => {
    await fetch(`/api/terminal/container/${model.id}/ops/save?path=${editor.file}`, {
      method: 'POST',
      body: editor.text
    });

    return true; // should close FullScreenDialog
  };

  const handleRunCommandClick = () => {
    setTemplaterContents({
      editor_content: directive?.command,
      content_id: directive?.command,
      cwd: directive?.cwd,
      parameters: directive?.parameters,
    });
    setTemplaterMode('directive');
    setTemplaterOpen(true);
  };

  // this gets passed down to the EndSessionDialog after a successful publish
  const afterPublish = () => {
    // release the container lock
    if (locked) {
      axios.delete(`/api/terminal/docker/${model.id}/release`)
        .then(() => {
          console.info('Successfully released the lock');
          // get rid of any query params in the url
          history.replace(`/summary/${model.id}`);
        }).catch(() => {
          console.error('There was an error releasing the lock');
        });
    }

    // make sure editing is disabled
    setDisabledMode(true);
    // mutate the model to ensure we get the new is_published attribute
    mutateModel(model.id);
  };

  return (
    <Container
      className={classes.root}
      component="main"
      maxWidth={mediumBreakpoint ? 'md' : 'xl'}
    >
      {loadingMode && <LoadingOverlay text="Loading..." />}
      <div>
        <div className={classes.headerContainer}>
          {(!disabledMode || relaunch) ? (
            <Button
              component={Link}
              // in relaunch mode, link to the /provision page
              // in normal container locked mode, link back to terminal
              to={relaunch ? `/provision/${model?.id}?relaunch=true` : `/term/${model?.id}`}
              size="small"
              startIcon={<ArrowBackIcon />}
              data-test="backToTerminalBtn"
            >
              Back to Terminal
            </Button>
          ) : <div />}
          {/* empty div to maintain the centering of the title because effort */}

          <Typography
            component="h3"
            variant="h4"
            align="center"
          >
            Model Summary
          </Typography>
          {(model?.is_published && !model.id) && (
            <div>
              <Typography className={classes.publishedBox}>
                <CheckIcon style={{ margin: '0 4px 4px 0' }} /> Published
              </Typography>
            </div>
          )}
          {model.is_published ? (
            <CreateRunButton model={model} />
          ) : (
            <div />
          )}
        </div>
        <Grid container spacing={2} className={classes.cardGridContainer}>
          <Grid item container xs={5} lg={6} spacing={2}>
            <Grid item xs={12} lg={6}>
              <div className={classes.runCommandContainer}>
                <Typography
                  align="center"
                  color="textSecondary"
                  variant="h6"
                  gutterBottom
                  className={classes.headerText}
                >
                  Model Execution Directive
                </Typography>
                <DirectiveBox
                  modelId={model.id}
                  summaryPage
                  handleClick={handleRunCommandClick}
                  disableClick={disabledMode}
                />
              </div>
            </Grid>
            <Grid item xs={12} lg={6}>
              <FileList
                fileType="config"
                model={model}
                disabledMode={disabledMode}
                setTemplaterMode={setTemplaterMode}
                setTemplaterContents={setTemplaterContents}
                setTemplaterOpen={setTemplaterOpen}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <FileList
                fileType="outputfile"
                model={model}
                disabledMode={disabledMode}
                setModelOutputFile={setModelOutputFile}
                setModelOutputOpen={setModelOutputOpen}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <SummaryAccessories modelId={model.id} disableClick={disabledMode} />
            </Grid>
          </Grid>
          <Grid item xs={7} lg={6}>
            <Typography
              align="center"
              color="textSecondary"
              variant="h6"
              gutterBottom
              className={classes.headerText}
            >
              Model Details
            </Typography>
            <div className={classes.detailsPanel}>
              <Button
                data-test="summaryDetailsEditButton"
                onClick={() => setOpenModelEdit(true)}
                className={classes.modelEditButton}
                disabled={disabledMode}
              >
                Edit
              </Button>
              <SummaryModelDetails model={model} />
            </div>
          </Grid>
        </Grid>
        <Grid className={classes.runGridContainer}>
          <ViewRuns rowsPerPage={5} modelId={model.id} />
        </Grid>

        <div className={classes.publishButton}>
          {/* In disabledMode, we show the button to trigger the intro dialog again */}
          {disabledMode ? (
            <Fab
              variant="extended"
              color="primary"
              style={{ margin: '10px' }}
              onClick={() => {
                setIntroDialogOpen(true);
              }}
            >
              {model.is_published ? 'Create New Model Version' : 'Edit Model'}
            </Fab>
          ) : <></>}
          {!model.is_published ? (
            <Tooltip
              title={
                uploading ? 'Please wait until the upload is complete before publishing'
                  : 'Make model available for running'
              }
              classes={{
                popper: classes.tooltip,
              }}
            >
              <span>
                <Fab
                  variant="extended"
                  color="primary"
                  style={{ margin: '10px' }}
                  onClick={handlePublishClick}
                  disabled={!model.image || uploading}
                  data-test="summaryPublishButton"
                >
                  Publish
                </Fab>
              </span>
            </Tooltip>
          ) : <></>}
        </div>

      </div>

      <SummaryIntroDialog
        open={introDialogOpen}
        setOpen={setIntroDialogOpen}
        model={model}
        summaryLoading={loadingMode}
        setSummaryLoading={setLoadingMode}
      />

      <FullScreenDialog
        open={openEditor}
        setOpen={setOpenEditor}
        onSave={saveEditor}
        title={`Editing ${editor?.file}`}
      >
        <SimpleEditor editorContents={editor} setEditorContents={setEditor} />
      </FullScreenDialog>

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
        open={modelOutputOpen}
        setOpen={setModelOutputOpen}
        onSave={() => {}}
        showSave={false}
        title={`${modelOutputFile?.name}`}
      >
        <iframe
          id="modelOutput"
          title="modelOutput"
          style={{ height: 'calc(100vh - 70px)', width: '100%' }}
          src={`/api/modelOutput/overview/${modelOutputFile?.id}?reedit=true`}
        />
      </FullScreenDialog>

      <EndSessionDialog
        open={endSessionDialog}
        setOpen={setEndSessionDialog}
        model={model}
        afterPublish={afterPublish}
      />

      <BasicAlert
        alert={{
          message: 'Please add a model execution directive before publishing the model',
          severity: 'warning',
        }}
        visible={noDirectiveAlert}
        setVisible={setNoDirectiveAlert}
      />

      <BasicAlert
        alert={{
          message: `
            If you navigate away without publishing your model, your model will not be available
            for execution.
          `,
          severity: 'error',
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        visible={navigateAwayWarning}
        setVisible={setNavigateAwayWarning}
      />

      {model && openModelEdit
        && <ModelSummaryEditor model={model} open={openModelEdit} setOpen={setOpenModelEdit} />}

      {(locked && uploading)
        && (
          <PublishContainer
            modelId={model.id}
            setUploading={setUploading}
            mutateModel={mutateModel}
          />
        )}

      <SummaryWebSocketHandler
        modelId={model.id}
        relaunch={relaunch}
      />
    </Container>
  );
};

export default SummaryContents;
