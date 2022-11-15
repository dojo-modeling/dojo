import React, {
  useCallback, useEffect, useRef
} from 'react'; // eslint-disable-line no-unused-vars

import { FitAddon } from 'xterm-addon-fit';
import { Terminal } from 'xterm';
import { WebLinksAddon } from 'xterm-addon-web-links';

import { useWebSocketContext, useWebSocketUpdateContext } from '../context';

require('xterm/css/xterm.css');

const Term = () => {
  const { emit } = useWebSocketContext();
  const { register, unregister } = useWebSocketUpdateContext();
  const termRef = useRef(null);
  const term = useRef(null);

  useEffect(() => {
    const fitAddon = new FitAddon();

    term.current = new Terminal({
      cursorBlink: true,
      theme: {
        foreground: '#fff',
        background: '#272d33',
      }
    });

    console.info('loading terminal');

    term.current.write('✨ http://dojo-modeling.com ✨\r\nFor help, run \x1b[1;34mdojo\x1b[0m\r\n\r\n');
    term.current.onData(async (data) => {
      console.debug(`-> ${data}`);
      await emit('xterm', data);
    });

    term.current.loadAddon(fitAddon);
    term.current.loadAddon(new WebLinksAddon());
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
      term.current.write(d);
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
      <div
        className="terminal-container"
        ref={termRef}
        style={{
          minHeight: 'calc(100vh - 24px)',
          margin: '12px auto',
          maxWidth: 'auto',
        }}
      />
    </>
  );
};

export default Term;
