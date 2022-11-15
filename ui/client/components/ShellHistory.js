import React, { useEffect, useState } from 'react';

import DeleteIcon from '@material-ui/icons/Delete';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import Button from '@material-ui/core/Button';
import ButtonBase from '@material-ui/core/ButtonBase';
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import { makeStyles, } from '@material-ui/core/styles';

import HelperTip from './HelperTip';

import { useDirective, useShellHistory } from './SWRHooks';

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: 'inherit',
    margin: [[theme.spacing(2), 0]],
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
  tableContainer: {
    overflow: 'auto',
    padding: [[0, theme.spacing(1), theme.spacing(1)]],
    [theme.breakpoints.down('xl')]: {
      height: '260px',
    },
    [theme.breakpoints.up('xl')]: {
      height: '400px',
    },
  },
  iconButton: {
    padding: '1px',
    margin: 0,
    color: 'white'
  },
  titleWrapper: {
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    gap: theme.spacing(2),
  },
}));

const ShellHistory = ({
  modelId,
  setTemplaterOpen,
  setTemplaterMode,
  setTemplaterContents,
}) => {
  const classes = useStyles();

  const tableRef = React.createRef(null);
  const [expanded, setExpanded] = useState(true);

  const {
    shellHistory, shellHistoryLoading, shellHistoryError, mutateShellHistory
  } = useShellHistory(modelId);
  const { directive } = useDirective(modelId);

  const removeItem = async (item) => {
    const resp = await fetch(`/api/dojo/terminal/container/history/${modelId}/${item.idx}`,
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
    // open the FullScreenTemplater
    setTemplaterOpen(true);
    setTemplaterMode('directive');
    setTemplaterContents({
      editor_content: item.command,
      content_id: item.command,
      cwd: item.cwd,
    });
  };

  const handleExpandClick = () => {
    setExpanded((prev) => !prev);
  };

  const isDirective = (command) => {
    if (!directive) return false;

    return command === directive.command;
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
    <div className={classes.root}>
      <ButtonBase className={classes.titleWrapper} onClick={handleExpandClick}>
        <Typography variant="h6" align="center">
          <HelperTip
            title="A history of all terminal commands entered in this session.
              You can permanently remove commands by clicking the trash can icon,
              or choose to mark a command as the model execution directive by clicking
              Mark Directive."
          >
            Shell History
          </HelperTip>
        </Typography>
        {expanded ? <ExpandMoreIcon fontSize="large" color="inherit" />
          : <ExpandLessIcon fontSize="large" color="inherit" />}
      </ButtonBase>
      <Collapse in={expanded}>
        <TableContainer className={classes.tableContainer}>
          <Table
            aria-labelledby="tableTitle"
            aria-label="enhanced table"
            className={classes.table}
          >
            <TableBody ref={tableRef} className={classes.tableBody}>
              {displayHistoryItems()}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </div>
  );
};

export default ShellHistory;
