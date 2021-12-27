import React, {
  useEffect,
  useState,
} from 'react';

import DeleteIcon from '@material-ui/icons/Delete';

import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import BasicAlert from './BasicAlert';
import { useContainerWithWorker, useDirective, useShellHistory } from './SWRHooks';

import {
  useWebSocketUpdateContext,
} from '../context';

const storeFileRequest = async (info) => {
  const rsp = await fetch('/api/dojo/terminal/file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(info)
  });

  if (!rsp.ok) {
    throw new Error(`Failed to send file info ${rsp.status}`);
  }

  return rsp.json();
};

const storeAccessoryRequest = async (info) => {
  const rsp = await fetch('/api/dojo/dojo/accessories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(info)
  });

  if (!rsp.ok) {
    throw new Error(`Failed to send accessory info ${rsp.status}`);
  }

  return rsp;
};

export const ContainerWebSocket = ({
  workerNode,
  setEditorContents, openEditor,
  setIsTemplaterOpen, setTemplaterContents, setTemplaterMode,
  setAnnotateUrl, setIsAnnotateOpen, setAnnotateFile
}) => {
  const { register, unregister } = useWebSocketUpdateContext();
  const [accessoryAlert, setAccessoryAlert] = useState(false);

  const { container } = useContainerWithWorker(workerNode);

  const { mutateShellHistory } = useShellHistory(container?.id);

  useEffect(() => {
    const onMessage = () => {
      mutateShellHistory();
    };

    const onBlocked = async (data) => {
      const { command, cwd } = JSON.parse(data);
      const s = command.trim();
      if (s.startsWith('edit ')) {
        const p = `${s.substring(5)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;
        const rsp = await fetch(
          `/api/terminal/container/${workerNode}/ops/cat?path=${encodeURIComponent(f)}`
        );
        if (rsp.ok) {
          setEditorContents({ text: await rsp.text(), file: f });
          openEditor();
        }
      } else if (s.startsWith('config ')) {
        // get file path user specified
        const path = `${s.substring('config '.length)}`;
        const fullPath = (path.startsWith('/')) ? path : `${cwd}/${path}`;

        // load that file's contents
        const rsp = await fetch(
          `/api/terminal/container/${workerNode}/ops/cat?path=${encodeURIComponent(fullPath)}`
        );
        if (rsp.ok) {
          const fileContent = await rsp.text();
          // pass them along to templater
          setTemplaterContents({
            editor_content: fileContent,
            content_id: fullPath,
          });
          // set the mode to config rather than directive
          setTemplaterMode('config');
          setIsTemplaterOpen(true); // open the <FullScreenDialog>
        }
      } else if (s.startsWith('tag ')) {
        const p = `${s.substring(4)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;

        const { id: reqid } = await storeFileRequest({
          model_id: container?.model_id,
          file_path: f,
          request_path: `/container/${workerNode}/ops/cat?path=${encodeURIComponent(f)}`
        });

        setAnnotateFile(`${f}`);
        setAnnotateUrl(`/api/annotate/byom?reqid=${reqid}`);
        setIsAnnotateOpen(true);
      } else if (s.startsWith('accessory ')) {
        const p = `${s.substring(10)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;
        const f_ = (f.includes(' ')) ? f.split(' ')[0] : f;
        const c = (f.includes(' ')) ? p.split(' ').slice(1, p.split(' ').length).join(' ').replaceAll('"', '') : null;

        await storeAccessoryRequest({
          model_id: container?.model_id,
          path: f_,
          caption: c
        }).then(() => setAccessoryAlert(true));
      }
    };

    if (container?.id) {
      register('term/message', onMessage);
      register('term/blocked', onBlocked);
    }

    return (() => {
      unregister('term/message', onMessage);
      unregister('term/blocked', onBlocked);
    });
  }, [
    mutateShellHistory,
    container,
    openEditor,
    register,
    unregister,
    setEditorContents,
    setIsTemplaterOpen,
    setTemplaterContents,
    setTemplaterMode,
    setAnnotateFile,
    setAnnotateUrl,
    setIsAnnotateOpen,
    workerNode
  ]);

  return (
    <>
      <BasicAlert
        alert={{
          message: 'Your accessory was successfully added',
          severity: 'success',
        }}
        visible={accessoryAlert}
        setVisible={setAccessoryAlert}
      />
    </>
  );
};

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: 'rgb(128, 128, 128, .25)',
    color: '#fff',
    margin: [[theme.spacing(2), 0]],
    padding: theme.spacing(2),
  },
  table: {
    borderCollapse: 'separate',
  },
  tableHead: {
    '& .MuiTableCell-stickyHeader': {
      top: 0,
      left: 0,
      zIndex: 2,
      position: 'sticky',
      background: 'rgb(39, 45, 51)'
    },
  },
  tableBody: {
    '& .MuiTableRow-root:hover': {
      background: 'rgba(255, 255, 255, 0.2)'
    },
    '& tr > td': {
      color: 'white',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      borderColor: 'rgba(255, 255, 255, .1)',
    },
  },
  iconButton: {
    padding: '1px',
    margin: 0,
    color: 'white'
  },
}));

export const ShellHistory = ({
  container,
  setIsTemplaterOpen,
  setTemplaterMode,
  setTemplaterContents,
}) => {
  const classes = useStyles();
  const tableRef = React.createRef(null);

  const {
    shellHistory, shellHistoryLoading, shellHistoryError, mutateShellHistory
  } = useShellHistory(container?.id);
  const { directive } = useDirective(container?.model_id);

  const removeItem = async (item) => {
    const resp = await fetch(`/api/dojo/terminal/container/${container?.id}/history/${item.idx}`,
      { method: 'DELETE' });
    if (resp.ok) {
      mutateShellHistory();
    }
  };

  useEffect(() => {
    if (tableRef.current.lastChild != null) {
      tableRef.current.lastChild.scrollIntoView({ behavior: 'smooth' });
    }
  }, [shellHistory, tableRef]);

  const handleAnnotationClick = async (item) => {
    // toggle <TemplaterEditor> to open in <App>, which loads the iframe
    setIsTemplaterOpen(true);
    // set mode to directive before we load in content
    // or we get [Object][Object] showing in the iframe before content loads
    setTemplaterMode('directive');
    setTemplaterContents({
      editor_content: item.command,
      content_id: item.command,
      cwd: item.cwd,
    });
  };

  const isDirective = (command) => {
    if (!directive) return false;

    return command === directive.command_raw;
  };

  const displayHistoryItems = () => {
    // keep track of whether we've already marked a run command
    let foundDirective = false;

    if (shellHistoryLoading) {
      return <tr><td><Typography>Loading history...</Typography></td></tr>;
    }

    if (shellHistoryError) {
      return <tr><td><Typography component="tr">There was an error loading container history</Typography></td></tr>;
    }

    return shellHistory.map((item) => {
      let directiveItem = false;
      let directiveDuplicate = false;
      // three options for the text, so control it here instead of a ternary
      let buttonText = 'Mark as directive';

      if (!foundDirective && isDirective(item.command)) {
        // only mark one item as the run command even if we have duplicates
        directiveItem = true;
        foundDirective = true;
        buttonText = 'Edit Directive';
      } else if (foundDirective && isDirective(item.command)) {
        // mark the duplicates as duplicates
        directiveDuplicate = true;
        buttonText = 'Directive (duplicate)';
      }

      return (
        <TableRow
          hover
          tabIndex={-1}
          key={item.idx}
          className={classes.tr}
          style={{
            backgroundColor: directiveItem || directiveDuplicate ? '#445d6e' : '',
            opacity: directiveDuplicate ? 0.5 : 1,
          }}
        >
          <TableCell align="left">
            <div style={{ paddingLeft: '2px' }}>
              {item.command}
            </div>
          </TableCell>
          <TableCell align="right">
            <Button
              color={directiveItem ? 'primary' : 'default'}
              data-test="terminalMarkDirectiveBtn"
              disabled={directiveDuplicate}
              disableElevation
              onClick={() => handleAnnotationClick(item)}
              size="small"
              style={{
                // use an off white color so the disabled duplicate text
                // is legible on the directive background
                color: directiveDuplicate ? '#B2B2B2' : '',
                margin: '4px 8px',
                width: '164px',
              }}
              variant="contained"
            >
              {buttonText}
            </Button>
          </TableCell>
          <TableCell align="left" width="8%">
            <Tooltip title="Delete" arrow>
              <IconButton
                aria-label="delete"
                className={classes.iconButton}
                onClick={() => removeItem(item)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Paper className={classes.root}>
      <TableContainer style={{ height: '400px', overflow: 'auto' }}>
        <Table
          aria-labelledby="tableTitle"
          aria-label="enhanced table"
          className={classes.table}
          stickyHeader
        >
          <TableHead>
            <TableRow className={classes.tableHead}>
              <TableCell colSpan={2} style={{ border: 0, borderRadius: '4px' }}>
                <Typography
                  component="div"
                  style={{
                    fontSize: '1.2rem',
                    lineHeight: '1.0',
                    padding: '5px 0 7px 10px',
                    color: '#fff',
                    margin: '0 auto',
                  }}
                  align="center"
                >
                  Shell History
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody ref={tableRef} className={classes.tableBody}>
            {displayHistoryItems()}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
