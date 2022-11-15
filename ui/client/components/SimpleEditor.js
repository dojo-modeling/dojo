import React, { useEffect, useRef, useState } from 'react';

import Container from '@material-ui/core/Container';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';

import { makeStyles } from '@material-ui/core/styles';

// we need these to be consistent in multiple places
// so the line numbers and text lines match up
const LINE_HEIGHT = 21;
const FONT_SIZE = '14px';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    fontFamily: 'monospace',
    margin: theme.spacing(4),
    backgroundColor: theme.palette.grey[100],
    padding: [[theme.spacing(3), 0]],
  },
  divider: {
    margin: [[0, '14px']],
  },
  textareaAutosize: {
    overflow: 'auto',
    width: '100%',
    height: '100%',

    '&:focus': {
      outline: 'none',
    }
  },
  lineNumbers: {
    color: theme.palette.grey[600],
    lineHeight: `${LINE_HEIGHT}px`,
    fontSize: FONT_SIZE,
    paddingLeft: '4px',
    // 44px covers the width of up to 4 digits
    width: '44px',
    overflow: 'hidden',
    textAlign: 'right',
    // ensure that we always break on \n
    whiteSpace: 'pre-wrap',
  },
}));

// build up a string of numbers to 9999 places
// assuming that files with over 10k lines are edge cases
// this goes next to the textarea as pseudo line numbers
const displayLineNumbers = () => {
  let numbers = '';
  let counter = 1;

  while (counter < 10000) {
    numbers += `${counter}\n`;
    counter += 1;
  }
  return numbers;
};

const SimpleEditor = ({ editorContents, setEditorContents }) => {
  const classes = useStyles();
  // we need this ref to access the height of the textarea so we can display
  // the appropriate number of line numbers
  const textRef = useRef(null);
  const [textHeight, setTextHeight] = useState(0);
  const [lineNumbers, setLineNumbers] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    // do this in a useEffect that just runs on render so it only happens once
    setLineNumbers(displayLineNumbers());
  }, []);

  useEffect(() => {
    if (textRef.current) {
      setTextHeight(textRef.current.offsetHeight);
    }
  }, [textRef]);

  // take the bigger of the textarea or window's height
  // then divide it by the line height and round it up
  // and multiply by the line height to ensure we show full line numbers
  const calculateNumbersHeight = () => (
    LINE_HEIGHT * Math.ceil(Math.max(textHeight, window.innerHeight) / LINE_HEIGHT)
  );

  const updateEditorContents = (e) => {
    setEditorContents((state) => ({
      ...state, text: e.target.value
    }));
  };

  return (
    <Container>
      <Paper className={classes.root} variant="outlined" onClick={() => { inputRef.current.focus(); }}>
        <div
          className={classes.lineNumbers}
          style={{ height: calculateNumbersHeight() }}
        >
          {lineNumbers}
        </div>
        <Divider orientation="vertical" flexItem className={classes.divider} />
        <TextField
          id="textField"
          data-test="terminalEditorTextArea"
          multiline
          placeholder=""
          value={editorContents?.text || ''}
          onChange={updateEditorContents}
          className={classes.textareaAutosize}
          inputRef={inputRef}
          ref={textRef}
          InputProps={{
            disableUnderline: true,
            // pass these styles directly to the underlying input element
            style: {
              fontFamily: 'monospace',
              fontSize: FONT_SIZE,
              lineHeight: `${LINE_HEIGHT}px`,
              paddingTop: 0,
            },
          }}
        />

      </Paper>
    </Container>
  );
};

export default SimpleEditor;
