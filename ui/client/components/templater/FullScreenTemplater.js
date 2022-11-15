import React, { useEffect, useState } from 'react';

import axios from 'axios';

import isEqual from 'lodash/isEqual';

import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

import { withStyles } from '@material-ui/core/styles';

import BasicAlert from '../BasicAlert';
import FullScreenDialog from '../FullScreenDialog';
import SavedTemplates from './SavedTemplates';
import TextAnnotater from './TextAnnotater';
import { useConfigs, useDirective } from '../SWRHooks';

const FullScreenTemplater = withStyles((theme) => ({
  allContentWrapper: {
    margin: [[theme.spacing(2), 0]],
    // full screen height minus the dialog top bar and the card margin
    height: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
  },
  dialogInterior: {
    backgroundColor: theme.palette.grey[50],
  },
  contentBox: {
    backgroundColor: theme.palette.grey[200],
    border: '1px solid black',
    borderRadius: theme.shape.borderRadius,
    padding: [[theme.spacing(3), theme.spacing(2)]],
    overflow: 'auto',
    flexShrink: '2',
  },
  contentText: {
    fontFamily: 'monospace',
    height: 'fit-content',
  },
  headerText: {
    color: theme.palette.grey[500],
  },
  shareScreen: {
    marginRight: '30%',

    transition: `margin-right ${theme.transitions.duration.enteringScreen}ms ${theme.transitions.easing.easeInOut}`,
  },
  fullScreen: {
    marginRight: 0,
    transition: `margin-right ${theme.transitions.duration.leavingScreen}ms ${theme.transitions.easing.easeInOut}`,
    height: '100vh',
  },
  contentWarningAlert: {
    maxWidth: '620px',
  },
  upperWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  textWrapper: {
    flexGrow: '2',
  },
  allParamsButton: {
    minWidth: '200px',
  },
}))(({
  classes,
  content,
  contentChanged,
  open,
  mode,
  modelId,
  setOpen
}) => {
  const [highlights, setHighlights] = useState(
    // if the parameters are passed in as a prop, then we have preexisting highlights
    // so load those in as state so we can edit them in this chain of components
    () => (content.parameters?.length ? content.parameters : [])
  );
  const [showContentChangedWarning, setShowContentChangedWarning] = useState(contentChanged);
  const [templatesDrawerOpen, setTemplatesDrawerOpen] = useState(false);

  const [disableConfirm, setDisableConfirm] = useState(false);
  const [hoveredHighlight, setHoveredHighlight] = useState();

  const { configs, mutateConfigs } = useConfigs(modelId);
  const { mutateDirective } = useDirective(modelId);

  // handle disabling the FullScreenDialog ConfirmDialog if no changes have been made
  useEffect(() => {
    if (!content.parameters && !highlights.length) {
      // if we have no params passed in, and no highlights are set
      // then no work has been done yet, so disable the FullScreenDialog confirm dialog
      setDisableConfirm(true);
    } else if (isEqual(content.parameters, highlights)) {
      // if the parameters passed in are equal to the highlights in the template
      // then no changes have been made, so disable the FullScreenDialog confirm dialog
      setDisableConfirm(true);
    } else {
      // otherwise, make sure our confirm dialog is enabled
      setDisableConfirm(false);
    }
  }, [content.parameters, highlights]);

  const handleSave = () => {
    if (mode === 'config' && !content.parameters && !highlights.length) {
      // if we have a config with no parameters added, just close the dialog without saving
      // but directives we want to save even without parameters, so continue on these
      return true;
    }

    const templatedText = {
      model_id: modelId,
      parameters: highlights,
    };

    // attach the full contents if it's a directive
    if (mode === 'directive') {
      templatedText.command = content.editor_content;
      templatedText.cwd = content.cwd;

      axios.post('/api/dojo/dojo/directive', templatedText)
        .then((response) => {
          console.info('posted to /directive', response);

          // put our newly templated text into the directive manually, and tell SWR not to update
          mutateDirective(templatedText, false);
          // and then fetch from SWR after elasticsearch has had time to update
          setTimeout(() => mutateDirective(), 5000);
        })
        .catch((error) => console.error('There was an error saving the directive: ', error));
    }

    if (mode === 'config') {
      templatedText.path = content.content_id;
      if (content.md5_hash) {
        // only set this if a hash is passed along
        templatedText.md5_hash = content.md5_hash;
      }

      // the dojo endpoint iterates through the configs it receives, so wrap the config in an array
      // and pass the full file content along with the config so dojo has access to it
      axios.post(
        '/api/dojo/dojo/config', [{
          model_config: templatedText, file_content: content.editor_content
        }]
      )
        .then((response) => {
          console.info('posted to /config', response);

          // < all of the below ensures that we'll have a snappy experience with new configs >
          // filter out the existing config (that matches templatedText) if there is one
          const dedupedConfigs = configs.filter((config) => config.path !== templatedText.path);

          // then mutate our local configs to include the updated templatedText
          // and tell SWR to not fetch new data from the server
          mutateConfigs([...dedupedConfigs, templatedText], false);
          // then fetch from dojo in 5 seconds, once ES has had time to update
          setTimeout(() => mutateConfigs(), 5000);
        })
        .catch((error) => console.error('There was an error saving the config: ', error));
    }

    // return true for the FullScreenDialog to close
    return true;
  };

  return (
    <>
      <FullScreenDialog
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        title={`${mode === 'directive' ? 'Directive' : 'Configuration File'} Parameter Templater`}
        noConfirm={disableConfirm}
        hideBackdrop
        className={templatesDrawerOpen ? classes.shareScreen : classes.fullScreen}
        PaperProps={{ elevation: 0 }}
        denseToolbar
      >
        <Container maxWidth="xl">
          <div className={classes.allContentWrapper}>
            <div className={classes.upperWrapper}>
              <div classes={classes.textWrapper}>
                <Typography variant="h6" className={classes.headerText}>
                  Instructions
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Use your mouse to highlight the characters, word, or words you would like
                  to replace with a parameter. A form will open in a separate panel for you to
                  add details about your parameter after you&apos;ve highlighted your selection.
                </Typography>
                <Typography variant="body1" gutterBottom>
                  After filling out the form and saving your parameter annotation, you can
                  continue to add more parameters by highlighting more text. New selections
                  cannot overlap with existing parameters.
                </Typography>
              </div>
              <Button
                onClick={() => setTemplatesDrawerOpen((prevDrawer) => !prevDrawer)}
                variant="outlined"
                disabled={!highlights.length}
                className={classes.allParamsButton}
              >
                {`${templatesDrawerOpen ? 'Hide' : 'View'} All Parameters`}
              </Button>
            </div>

            <Typography variant="h6" className={classes.headerText} gutterBottom>
              Your Text
            </Typography>
            <div className={classes.contentBox}>
              <Typography component="div" className={classes.contentText}>
                <TextAnnotater
                  content={content}
                  setHighlights={setHighlights}
                  highlights={highlights}
                  hoveredHighlight={hoveredHighlight}
                  modelId={modelId}
                  mode={mode}
                />
              </Typography>
            </div>
          </div>
        </Container>
      </FullScreenDialog>
      <SavedTemplates
        open={templatesDrawerOpen}
        onClose={() => setTemplatesDrawerOpen(false)}
        templates={highlights}
        setHoveredHighlight={setHoveredHighlight}
      />
      <BasicAlert
        alert={{
          message: `Your underlying file content has changed. Please check all of your
            annotated parameters to ensure that everything is still in the correct place.`,
          severity: 'warning',
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        visible={showContentChangedWarning}
        setVisible={setShowContentChangedWarning}
        disableClickaway
        autoHideDuration={null}
        className={classes.contentWarningAlert}
        action={(
          <Button
            color="inherit"
            size="small"
            onClick={() => setShowContentChangedWarning(false)}
          >
            Dismiss
          </Button>
        )}
      />
    </>
  );
});

export default FullScreenTemplater;
