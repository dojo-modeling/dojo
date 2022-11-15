import React, { useState } from 'react';

import Button from '@material-ui/core/Button';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import { lighten, makeStyles } from '@material-ui/core/styles';

import {
  selectionIsBackwards,
  selectionIsEmpty,
  selectionOutOfRange,
  selectionOverlaps,
  splitWithOffsets,
} from './templaterUtils';

import BasicAlert from '../BasicAlert';
import TemplaterDrawer from './TemplaterDrawer';

const useStyles = makeStyles((theme) => ({
  mark: {
    backgroundColor: lighten(theme.palette.primary.light, 0.5),
    margin: '0 1px',
    cursor: 'default',
    whiteSpace: 'pre',
  },
  darkerMark: {
    backgroundColor: theme.palette.primary.dark,
    margin: '0 1px',
    cursor: 'default',
    whiteSpace: 'pre',
    color: 'white',
  },
  tooltip: {
    backgroundColor: theme.palette.grey[700],
    minWidth: '180px',
    maxWidth: '230px',
  },
  tooltipArrow: {
    backgroundColor: theme.palette.grey[700],
  },
  buttonWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
  },
}));

const filterHighlights = (target, highlights) => (
  highlights.filter((highlight) => (
    highlight.start !== target.start && highlight.end !== target.end))
);

// These values live here rather than in TemplaterForm so that we can easily
// add in the highlighted text as default_value before we initialize Formik
const defaultInitialValues = {
  name: '',
  description: '',
  type: '',
  default_value: '',
  unit: '',
  unit_description: '',
  data_type: '',
  predefined: false,
  options: [],
  min: '',
  max: '',
};

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

// the highlighted text
const Mark = ({
  end,
  start,
  content,
  annotation,
  handleMoveHighlight,
  handleEditHighlight,
  disableTooltipButtons,
  savedHover,
  formOpen,
}) => {
  const classes = useStyles();

  const displayInnerContent = () => (
    <span
      className={savedHover ? classes.darkerMark : classes.mark}
      data-start={start}
      data-end={end}
    >
      {content}
    </span>
  );

  // Never display the tooltip when the form is open
  return (
    formOpen ? displayInnerContent() : (
      <Tooltip
        classes={{ tooltip: classes.tooltip, tooltipArrow: classes.tooltipArrow }}
        title={(
          <>
            <Typography variant="body2" color="inherit" align="center">
              {annotation?.name
                ? `Parameter name: ${annotation?.name}` : 'This is a highlighted parameter'}
            </Typography>
            {/* When moving one annotation, disable all other tooltip buttons */}
            {!disableTooltipButtons && (
              <div className={classes.buttonWrapper}>
                <Button
                  onClick={() => handleMoveHighlight(start, end, annotation)}
                  color="inherit"
                  size="small"
                  variant="outlined"
                >
                  Move
                </Button>
                <Button
                  onClick={() => handleEditHighlight(start, end, annotation)}
                  color="inherit"
                  size="small"
                  variant="outlined"
                >
                  Edit
                </Button>
              </div>
            )}
          </>
        )}
        arrow
        placement="top"
        leaveDelay={200}
        interactive
      >
        {displayInnerContent()}
      </Tooltip>
    )
  );
};

// each individual chunk of text
const Split = ({
  content,
  end,
  mark,
  start,
  annotation,
  handleEditHighlight,
  handleMoveHighlight,
  disableTooltipButtons,
  savedHover,
  formOpen,
}) => {
  if (mark) {
    return (
      <Mark
        content={content}
        disableTooltipButtons={disableTooltipButtons}
        end={end}
        start={start}
        annotation={annotation}
        handleEditHighlight={handleEditHighlight}
        handleMoveHighlight={handleMoveHighlight}
        savedHover={savedHover}
        formOpen={formOpen}
      />
    );
  }

  // un-highlighted text
  return (
    <span
      data-start={start}
      data-end={end}
      style={{ whiteSpace: 'pre' }}
    >
      {content}
    </span>
  );
};

const TextAnnotater = ({
  content,
  setHighlights,
  highlights,
  hoveredHighlight,
  modelId,
  mode,
}) => {
  const [formOpen, setFormOpen] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState();
  // just use this for the alert, as we don't want the form edit mode tied
  // to whether the alert is open or closed
  const [editingTemplateAlert, setEditingTemplateAlert] = useState(false);
  // when a saved annotation is being moved
  const [isMoving, setIsMoving] = useState(false);
  // temporarily store the original coordinates and text of the template we're editing
  // in case the user decides to revert their changes
  const [editingHighlight, setEditingHighlight] = useState();

  const contentText = content?.editor_content;

  const handleDelete = (highlightToDelete) => {
    setHighlights((prevHighlights) => (
      filterHighlights(highlightToDelete, prevHighlights)
    ));

    setFormOpen(false);
    setCurrentHighlight(null);
  };

  const afterEditCleanup = () => {
    setEditingTemplateAlert(false);
    setCurrentHighlight(null);
    setEditingHighlight(null);
    setIsMoving(false);
  };

  const handleEditHighlight = (start, end, annotation) => {
    setFormOpen(true);
    // TemplaterForm will read in currentHighlight and initialValues from the annotation
    setCurrentHighlight({
      start, end, text: contentText.slice(start, end), annotation
    });
  };

  const handleMoveHighlight = (start, end, annotation) => {
    setHighlights((prevHighlights) => (
      filterHighlights({ start, end }, prevHighlights)
    ));
    setCurrentHighlight({ annotation });
    setEditingTemplateAlert(true);
    setIsMoving(true);
    // this needs start, end, text in it
    setEditingHighlight({ start, end, text: contentText.slice(start, end) });
  };

  const handleFormClose = () => {
    if (!isMoving) {
      // don't clear currentHighlight when isMoving, because we want to keep the annotation
      setCurrentHighlight(null);
    }

    setFormOpen(false);
  };

  const handleFormSubmit = (formValues) => {
    // add the form values into the highlight object
    const highlightWithAnnotation = { ...currentHighlight, annotation: { ...formValues } };
    // and add them to the parent's saved highlights
    setHighlights((prevHighlights) => {
      // filter out any existing highlights that match the current highlight
      // in case we are editing a highlight - this will prevent duplicates
      const filtered = filterHighlights(highlightWithAnnotation, prevHighlights);
      return [...filtered, highlightWithAnnotation];
    });

    // and clear our current selection in the browser
    window.getSelection().empty();

    // clear out all the component states after we have edited/submitted
    afterEditCleanup();
  };

  const handleRevertEdit = () => {
    afterEditCleanup();
    setHighlights((prev) => [...prev, { ...currentHighlight, ...editingHighlight }]);
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();

    if (selectionIsEmpty(selection)) return;

    let start = parseInt(selection.anchorNode.parentElement.getAttribute('data-start'), 10)
      + selection.anchorOffset;
    let end = parseInt(selection.focusNode.parentElement.getAttribute('data-start'), 10)
      + selection.focusOffset;

    if (selectionIsBackwards(selection)) {
      [start, end] = [end, start];
    }

    // only proceed if the selected text is within the text wrapped by TextAnnotater
    if (selectionOutOfRange(start, end)) return;

    // if current selection overlaps with any other highlights, don't highlight
    if (selectionOverlaps(start, end, highlights)) return;

    // open the form, which will then highlight when the user submits
    setFormOpen(true);
    setCurrentHighlight((loadedAnnotation) => ({
      ...loadedAnnotation, start, end, text: contentText.slice(start, end)
    }));
  };

  // if the highlight is moused over in the SavedTemplates drawer, reflect it here
  const isHovered = (split) => (
    split.start === hoveredHighlight?.start
  );

  const splits = splitWithOffsets(contentText, highlights);
  return (
    <>
      <div onMouseUp={handleMouseUp}>
        {splits.map((split) => (
          <Split
            key={`${split.start}-${split.end}`}
            disableTooltipButtons={isMoving}
            handleEditHighlight={handleEditHighlight}
            handleMoveHighlight={handleMoveHighlight}
            savedHover={isHovered(split)}
            formOpen={formOpen}
            {...split}
          />
        ))}
      </div>
      <TemplaterDrawer
        formOpen={formOpen}
        onClose={handleFormClose}
        currentHighlight={currentHighlight}
        initialValues={
          /* Load in an annotation if it exists, or use the default blank values,
            but add the highlighted text as default_value or an empty string on initial load */
          currentHighlight?.annotation
          || { ...defaultInitialValues, default_value: currentHighlight?.text || '' }
        }
        onSubmit={handleFormSubmit}
        handleDelete={handleDelete}
        isMoving={isMoving}
        modelId={modelId}
        highlights={highlights}
        content={content}
        mode={mode}
      />
      <BasicAlert
        alert={{
          message: 'Please highlight a new selection to continue editing your parameter',
          severity: 'info'
        }}
        visible={editingTemplateAlert}
        setVisible={setEditingTemplateAlert}
        autoHideDuration={null}
        disableClickaway
        action={(
          <Button
            onClick={handleRevertEdit}
            color="inherit"
          >
            Revert Changes
          </Button>
        )}
      />
    </>
  );
};

export default TextAnnotater;
