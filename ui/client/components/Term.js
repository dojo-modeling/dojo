import React, {
  useCallback, useEffect, useRef
} from 'react'; // eslint-disable-line no-unused-vars

import Box from '@material-ui/core/Box';

import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';

import { useWebSocketContext, useWebSocketUpdateContext } from '../context';

require('xterm/css/xterm.css');

// eslint-disable-next-line no-unused-vars
class TermHelperAddon {
  constructor(setABoxState) {
    this._term = null;
    this._setABoxState = setABoxState;
  }

  activate(term) {
    console.debug('addon activate');
    this._term = term;
    this._active = true;
  }

  currentRow() {
    if (!this._active) { return 0; }
    return this._term.buffer.active.cursorY;
  }

  currentRowText() {
    if (!this._active) { return ''; }
    const curY = this._term.buffer.active.cursorY;
    const buffline = this._term.buffer.active.getLine(curY);
    return buffline.translateToString().trim();
  }

  currsorRect() {
    if (!this._active) { return {}; }
    return this._term.textarea.getBoundingClientRect();
  }

  update() {
    if (this._active) {
      this._setABoxState({ text: this.currentRowText(), rect: this.currsorRect() });
    }
  }

  dispose() {
    this._active = false;
    console.debug('addon deactivate');
  }
}

/*
  Sample of attaching to Term Cursor
  @rect - rectangle of cursor
  @text - term current line of text
*/
// eslint-disable-next-line no-unused-vars
const ABox = ({ rect, text }) => {
  const [style, setStyle] = React.useState({
    height: 100,
    width: 200,
    backgroundColor: '#000',
    color: '#fff',
    position: 'absolute',
    opacity: 0.8,
    zIndex: 100,
    display: 'none'
  });

  useEffect(() => {
    const x = rect.x + rect.width;
    const y = rect.y + rect.height;
    if (text.includes('python')) {
      setStyle({
        ...style, top: y, left: x, display: 'unset'
      });
    } else {
      setStyle({ ...style, display: 'none' });
    }
  }, [text, rect, style]);

  return (
    <Box style={style}>
      {text}
    </Box>
  );
};

const Term = () => {
  const { emit } = useWebSocketContext();
  const { register, unregister } = useWebSocketUpdateContext();
  const termRef = useRef(null);
  const term = useRef(null);

  // const [aBoxState, setABoxState] = React.useState({text: "", rect: {}});
  // const termHelperAddon = new TermHelperAddon(setABoxState);

  useEffect(() => {
    const fitAddon = new FitAddon();

    term.current = new Terminal({
      cursorBlink: true,
      theme: {
        foreground: '#fff',
        background: '#272d33',
      }
    });

    // term.current.setOption('logLevel', 'debug');

    console.info('loading terminal');

    term.current.onData(async (data) => {
      console.debug(`-> ${data}`);
      await emit('xterm', data);
    });

    term.current.loadAddon(fitAddon);
    // term.current.loadAddon(termHelperAddon);
    term.current.open(termRef.current);
    fitAddon.fit();
  }, [emit]);

  const initTerm = useCallback(async () => {
    console.debug({ cols: term.current.cols, rows: term.current.rows });
    await emit('terminal/resize', JSON.stringify({ cols: term.current.cols, rows: term.current.rows }));
    await emit('ssh/connect', 'connect');
  }, [emit]);

  useEffect(() => {
    const xtermHandler = (d) => {
      console.debug(`<- ${d}`);
      term.current.write(d, () => {
        /* exprimental
           console.debug('write done');
           termHelperAddon.update()
        */
      });
    };

    register('xterm', xtermHandler);
    initTerm();
    return (() => {
      console.info('ssh/disconnect');
      emit('ssh/disconnect', 'disconnect');
      unregister('xterm', xtermHandler);
    });
  }, [register, unregister, initTerm, emit]);

  return (
    <>
      <div className="terminal-container" ref={termRef} />
      {/* <ABox {...aBoxState} /> */}
    </>
  );
};

export default Term;
