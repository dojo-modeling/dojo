import React, { useEffect, useState } from 'react';

import axios from 'axios';

import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Button from '@material-ui/core/Button';
import CheckIcon from '@material-ui/icons/Check';
import Container from '@material-ui/core/Container';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Fab from '@material-ui/core/Fab';
import Grid from '@material-ui/core/Grid';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { makeStyles, useTheme } from '@material-ui/core/styles';

import { Link, useHistory, useLocation } from 'react-router-dom';

import BasicAlert from './components/BasicAlert';
import DeletionDialog from './components/DeletionDialog';
import DirectiveBox from './components/DirectiveBox';
import EndSessionDialog from './components/EndSessionDialog';
import FileCardList from './components/FileCardList';
import FullScreenDialog from './components/FullScreenDialog';
import LoadingOverlay from './components/LoadingOverlay';
import { ModelSummaryEditor } from './components/ModelSummaryEditor';
import PublishContainer from './publish_container';
import TemplaterEditor from './components/TemplaterEditor';
import SimpleEditor from './components/SimpleEditor';
import SummaryAccessories from './components/SummaryAccessories';
import SummaryIntroDialog from './components/SummaryIntroDialog';
import SummaryModelDetails from './components/SummaryModelDetails';

import {
  useConfigs, useContainerWithWorker, useDirective, useModel, useOutputFiles
} from './components/SWRHooks';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(2)]],
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  headerContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr repeat(3, auto) 1fr',
    gridColumnGap: theme.spacing(1),
    paddingBottom: theme.spacing(3),
    '& > :first-child': {
      placeSelf: 'start',
    },
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

const Page = ({
  modelIdQueryParam, workerNode, published, save
}) => {
  const [introDialogOpen, setIntroDialogOpen] = useState(!!modelIdQueryParam);
  // disable the page whenever there's no worker present
  const [disabledMode, setDisabledMode] = useState(!workerNode);
  const [loadingMode, setLoadingMode] = useState(false);
  // when we're uploading the container to dockerhub - when there's a worker and the save flag
  // is present
  const [uploading, setUploading] = useState(!!workerNode && save);

  const history = useHistory();

  // these can sometimes change without the page reloading, so keep an eye on them with this
  useEffect(() => {
    // show the intro dialog if we are finding the model through the model id
    // and thus don't have a worker loaded
    // but don't show it if we have the published flag, which we get after publishing
    setIntroDialogOpen(!!modelIdQueryParam && !published);
    // and disable the page if we don't have a workernode (ie a container running)
    setDisabledMode(!workerNode);
  }, [modelIdQueryParam, workerNode, published]);

  const {
    container, mutateContainer
  } = useContainerWithWorker(workerNode);

  // get the model id from the container if we have it, or from the query param
  const modelId = workerNode && container ? container?.model_id : modelIdQueryParam;

  const {
    model, modelLoading, modelError, mutateModel
  } = useModel(modelId);
  const {
    configs, configsLoading, configsError, mutateConfigs
  } = useConfigs(modelId);
  const {
    outputs, outputsLoading, outputsError, mutateOutputs
  } = useOutputFiles(modelId);

  const { directive } = useDirective(modelId);

  const [openEditor, setOpenEditor] = useState(false);
  const [editor, setEditor] = useState(() => ({
    text: '', file: ''
  }));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionSelection, setDeletionSelection] = useState(() => ({
    type: null, id: null, description: 'Hello world',
  }));

  const [openTemplater, setOpenTemplater] = useState(false);
  const [isTemplaterSaving, setIsTemplaterSaving] = useState(false);
  const [templaterContents, setTemplaterContents] = useState({});
  const [templaterMode, setTemplaterMode] = useState();

  const [annotateOpen, setAnnotateOpen] = useState(false);
  const [annotateFile, setAnnotateFile] = useState();

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
    // only do it if there is a container running
    // as this doesn't apply to version bump/metadata edits
    if (workerNode) {
      window.addEventListener('beforeunload', onUnload);
      return () => {
        window.removeEventListener('beforeunload', onUnload);
      };
    }
  }, [workerNode]);

  const openConfigTemplater = async (item) => {
    const response = await fetch(
      `/api/terminal/container/${workerNode}/ops/cat?path=${encodeURIComponent(item.path)}`
    );

    if (response.ok) {
      const content = await response.text();

      setTemplaterContents({
        editor_content: content,
        content_id: item.path,
      });

      setTemplaterMode('config');
      setOpenTemplater(true);
    }
  };

  const handlePublishClick = (e) => {
    e.preventDefault();

    if (!directive) {
      setNoDirectiveAlert(true);
      return;
    }

    setEndSessionDialog(true);
  };

  const FileTile = ({ item }) => {
    const fileParts = new URL(`file://${item}`).pathname.split('/');
    const fileName = fileParts.pop();
    const filePath = fileParts.join('/').replace('/home/terminal/', '~/');
    return (
      <span>
        <Typography variant="subtitle1" noWrap>{fileName}</Typography>
        <Typography variant="caption" noWrap component="div">{filePath}</Typography>
      </span>
    );
  };

  const templaterDialogOnSave = () => {
    // trigger TemplaterEditor to tell the templater app to save
    setIsTemplaterSaving(true);
    return false; // don't close FullScreenDialog
  };

  const saveEditor = async () => {
    await fetch(`/api/terminal/container/${workerNode}/ops/save?path=${editor.file}`, {
      method: 'POST',
      body: editor.text
    });

    await fetch(`/api/terminal/container/store/${container.id}/edits`, {
      method: 'PUT',
      body: JSON.stringify(editor)
    });

    // refetch the container after our request
    // potential TODO: return the container after the post request so we don't need to do this
    mutateContainer();
    return true; // should close FullScreenDialog
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeletionSelection();
  };

  const handleDeleteItem = async () => {
    console.log('deleting', deletionSelection);
    let url = `/api/dojo/dojo/${deletionSelection.type}/${deletionSelection.id}`;
    // Add params to end of URL is params included in deletionSelection
    if (deletionSelection?.params) {
      const paramList = [];
      Object.entries(deletionSelection.params).forEach(([key, val]) => {
        paramList.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      });
      url = `${url}?${paramList.join('&')}`;
    }

    const resp = await fetch(
      url,
      {
        method: 'DELETE',
      }
    );

    if (resp.ok) {
      handleDeleteDialogClose();
      // Dojo needs 1 second to update the DB before we can GET the accessories again
      if (deletionSelection.type === 'config') {
        setTimeout(() => mutateConfigs(), 1000);
      } else if (deletionSelection.type === 'fileoutputs') {
        setTimeout(() => { mutateOutputs(); }, 1000);
      }
    } else {
      console.log(`There was an error deleting "${deletionSelection.description}"`);
    }
  };

  const displayModelDetails = () => {
    let parsedCoordinates = [];

    if (modelLoading) {
      return <div>Loading...</div>;
    }

    if (modelError) {
      return <div>There was an error, please refresh the page</div>;
    }

    if (model.geography?.coordinates.length) {
      parsedCoordinates = model.geography?.coordinates.map((coords, i, arr) => {
        // only display the separator if we aren't at the end of the list
        const separator = i !== arr.length - 1 ? ', ' : '';

        if (!coords[0].length || !coords[1].length) return null;

        return (
          <span key={coords}>
            {`[${coords[0].join()};${coords[1].join()}]`}
            {separator}
          </span>
        );
      });
    }

    // no need to spread the following out onto a million lines
    /* eslint-disable react/jsx-one-expression-per-line */
    return (
      <div>
        <Typography variant="subtitle2" className={classes.modelHeader}>
          Overview:
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model Name: {model.name}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model Website: {model.maintainer?.website}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model Family: {model.family_name}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model Description: {model.description}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model Image: {model.image}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model Start Date: {new Date(model.period?.gte).toLocaleDateString()}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model End Date: {new Date(model.period?.lte).toLocaleDateString()}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Stochastic Model: {model.stochastic}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Model ID: {model.id}
        </Typography>

        <Typography variant="subtitle2" className={classes.modelHeader}>Maintainer:</Typography>
        <Typography variant="body2" className={classes.subsection}>
          Name: {model.maintainer?.name}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Email: {model.maintainer?.email}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Organization: {model.maintainer?.organization}
        </Typography>

        <Typography variant="subtitle2" className={classes.modelHeader}>Geography:</Typography>
        <Typography variant="body2" className={classes.subsection}>
          Country: {model.geography?.country?.join(', ')}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Admin 1: {model.geography?.admin1?.join(', ')}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Admin 2: {model.geography?.admin2?.join(', ')}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Admin 3: {model.geography?.admin3?.join(', ')}
        </Typography>
        <Typography variant="body2" className={classes.subsection}>
          Coordinates: {parsedCoordinates}
        </Typography>
        <Typography variant="subtitle2" className={classes.modelHeader}>Categories:</Typography>
        <Typography variant="body2" className={classes.subsection}>
          {model.category?.join(', ')}
        </Typography>
      </div>
    );
  };

  const handleRunCommandClick = () => {
    setTemplaterContents({
      editor_content: directive?.command_raw,
      content_id: directive?.command_raw,
      cwd: directive?.cwd,
    });
    setTemplaterMode('directive');
    setOpenTemplater(true);
  };

  if (modelLoading) {
    return <LoadingOverlay text="Loading summary" />;
  }

  if (modelError) {
    return (
      <LoadingOverlay
        text="There was an error loading the model summary"
        error={modelError}
      />
    );
  }

  const afterUpload = () => {
    mutateModel();
  }

  // this gets passed down to the EndSessionDialog and is called when the user closes the dialog
  // after a successful publish
  const afterPublish = (closeDialog) => {
    // mutate our SWR model as we rely on model.image to enable our publish button
    mutateModel();
    // shut down the container
    if (workerNode && container) {
      axios.delete(`/api/terminal/docker/${workerNode}/stop/${container.id}`)
        .then((resp) => {
          console.log('Successfully shut down the container', resp);
        })
        .catch((err) => {
          console.debug('There was an error shutting down the container: ', err);
        });
    }

    // then change the URL to be model-based (instead of worker based) again
    // and give us the published flag so the intro dialog doesn't show
    history.replace(`/summary?model=${model.id}&published=true`);
    // make sure editing is disabled
    setDisabledMode(true);
    // mutate the model to ensure we get the new is_published attribute
    mutateModel(model.id);
    // and call the passed in closeDialog function to close the EndSessionDialog
    closeDialog();
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
          {workerNode ? (
            <Button
              component={Link}
              to={`/term/${workerNode}/${model?.id}`}
              size="small"
              startIcon={<ArrowBackIcon />}
            >
              Back to Terminal
            </Button>
          ) : <div />}
          {/* empty div to maintain the centering of the title because effort */}

          <Typography
            className={classes.header}
            component="h3"
            variant="h4"
            align="center"
          >
            Model Summary
          </Typography>
          {(model?.is_published && !workerNode) && (
            <div>
              <Typography className={classes.publishedBox}>
                <CheckIcon style={{ margin: '0 4px 4px 0' }} /> Published
              </Typography>
            </div>
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
                  modelId={modelId}
                  summaryPage
                  handleClick={handleRunCommandClick}
                  disableClick={disabledMode}
                />
              </div>
            </Grid>
            <Grid item xs={12} lg={6}>
              <FileCardList
                name="Config"
                files={configs}
                loading={configsLoading}
                error={configsError}
                primaryClickHandler={(config) => openConfigTemplater(config)}
                primaryIcon={<EditIcon />}
                secondaryClickHandler={async (config) => {
                  setDeletionSelection({
                    type: 'config',
                    id: config.model_id,
                    description: config.path,
                    params: {
                      path: config.path,
                    },
                  });
                  setDeleteDialogOpen(true);
                }}
                secondaryIcon={<DeleteIcon />}
                cardContent={(config) => <FileTile item={config.path} />}
                disableClick={disabledMode}
                parameters={model?.parameters}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <FileCardList
                name="Output"
                files={outputs}
                loading={outputsLoading}
                error={outputsError}
                primaryClickHandler={(output) => {
                  setAnnotateFile(output);
                  setAnnotateOpen(true);
                }}
                primaryIcon={<EditIcon />}
                secondaryClickHandler={(config) => {
                  setDeletionSelection({
                    type: 'outputfile', id: config.id, description: `${config.name}: ${config.path}`
                  });
                  setDeleteDialogOpen(true);
                }}
                secondaryIcon={<DeleteIcon />}
                disableClick={disabledMode}
                cardContent={(output) => (
                  <>
                    <Typography variant="subtitle1" noWrap>{output.name}</Typography>
                    <Typography variant="caption" noWrap component="div">{output.path}</Typography>
                  </>
                )}
                parameters={model?.outputs}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <SummaryAccessories modelId={modelId} disableClick={disabledMode} />
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
                uploading ? 'Please wait until the upload is complete before publishing' : 'Edit model and save an image to publish'
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
                >
                  Publish
                </Fab>
              </span>
            </Tooltip>
          ): <></>}
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

      <FullScreenDialog
        open={openTemplater}
        setOpen={setOpenTemplater}
        onSave={templaterDialogOnSave}
      >
        <TemplaterEditor
          directive={{
            command: container?.run_command,
            cwd: container?.run_cwd
          }}
          modelInfo={{ id: modelId }}
          isSaving={isTemplaterSaving}
          setIsSaving={setIsTemplaterSaving}
          mode={templaterMode}
          templaterContents={templaterContents}
          setIsTemplaterOpen={setOpenTemplater}
        />
      </FullScreenDialog>

      <FullScreenDialog
        open={annotateOpen}
        setOpen={setAnnotateOpen}
        onSave={() => {}}
        showSave={false}
        title={`${annotateFile?.name}`}
      >
        <iframe
          id="annotate"
          title="annotate"
          style={{ height: 'calc(100vh - 70px)', width: '100%' }}
          src={`/api/annotate/overview/${annotateFile?.id}?reedit=true`}
        />
      </FullScreenDialog>

      <DeletionDialog
        open={deleteDialogOpen}
        itemDescr={deletionSelection?.description}
        deletionHandler={handleDeleteItem}
        handleDialogClose={handleDeleteDialogClose}
      />

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

      {uploading
        && <PublishContainer worker={workerNode} setUploading={setUploading} afterUpload={afterUpload} />}
    </Container>
  );
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const Summary = () => {
  const query = useQuery();
  const worker = query.get('worker');
  const model = query.get('model');
  const published = query.get('published');
  const save = query.get('save');

  if (worker) {
    return <Page workerNode={worker} save={save} />;
  }

  if (model) {
    return <Page modelIdQueryParam={model} published={published} />;
  }
};

export default Summary;
