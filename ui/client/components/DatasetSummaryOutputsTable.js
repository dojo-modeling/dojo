import React from 'react';

import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import { makeStyles, withStyles } from '@material-ui/core/styles';

import AliasDialog from './AliasDialog';
import CollapseText from './CollapseText';

const StyledTableCell = withStyles((theme) => ({

  root: {
    color: theme.palette.common.black,
    padding: [[theme.spacing(1), theme.spacing(2)]],
    minWidth: '190px',
    maxWidth: '350px',
    maxHeight: '100px',
    backgroundColor: theme.palette.common.white,
    verticalAlign: 'top',
  },
  head: {
    backgroundColor: theme.palette.common.white,
    color: theme.palette.common.black,
    padding: [[theme.spacing(1), theme.spacing(2)]],
    minWidth: '100px',
    fontWeight: 'bold',
    fontSize: '17px',
  },
  body: {
    fontSize: 14,
  },
}))(TableCell);

const StyledTableRow = withStyles((theme) => ({
  root: {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
      color: theme.palette.common.black,
    },
  },
}))(TableRow);

const useStyles = makeStyles((theme) => ({
  indexRow: {
    maxWidth: '75px',
    backgroundColor: theme.palette.action.hover,
  },
}));

function DatasetSummaryOutputsTable({ dataset }) {
  const columns = [...dataset?.outputs, ...(dataset?.qualifier_outputs || [])
    .filter((qual) => !['admin1', 'admin2', 'admin3', 'country', 'lat', 'lng'].includes(qual.name))];

  const classes = useStyles();

  return (
    <div>
      <TableContainer component={Paper} elevation={0} variant="outlined">
        <Table className={classes.table} aria-label="customized table">
          <TableHead className={classes.tableHead}>

            <TableRow>
              <TableCell key="first" align="center" className={classes.indexRow} />
              { columns.map((column, index) => <StyledTableCell key={index.toString().concat('header')} align="center">{column?.name}</StyledTableCell>)}
            </TableRow>
          </TableHead>

          <TableBody>
            <StyledTableRow>
              <TableCell key="first" align="center" className={classes.indexRow}><b> Display Name: </b> </TableCell>
              {columns.map((row, index) => (
                <StyledTableCell key={index.toString().concat('firstRow')} align="left">
                  {row?.display_name ? row.display_name : 'NA'}
                </StyledTableCell>
              ))}
            </StyledTableRow>
            <StyledTableRow>
              <TableCell key="first" align="center" className={classes.indexRow}><b> Description:  </b> </TableCell>
              {columns.map((row, index) => (
                <StyledTableCell styles={{ verticalAlign: 'top' }} key={index.toString().concat('secondRow')} align="left">
                  {row?.description
                    ? (
                      <CollapseText
                        key={index.toString().concat('secondRowcollapse')}
                        childrenText={row.description}
                      />
                    )
                    : 'NA'}
                </StyledTableCell>
              ))}
            </StyledTableRow>
            <StyledTableRow>
              <TableCell key="first" align="center" className={classes.indexRow}><b> Type: </b>  </TableCell>

              {columns.map((row, index) => (
                <StyledTableCell key={index.toString().concat('thirdRow')} align="left">
                  {row?.type ? row.type : 'NA'}
                </StyledTableCell>
              ))}
            </StyledTableRow>
            <StyledTableRow>
              <TableCell key="first" align="center" className={classes.indexRow}><b> Unit - Unit Description: </b>  </TableCell>

              {columns.map((row, index) => (
                <StyledTableCell key={index.toString().concat('fourthRow')} align="left">
                  {row?.unit ? row.unit : 'NA'}<br /><br />
                  {row?.unit_description ? row.unit_description : 'NA'}
                </StyledTableCell>
              ))}
            </StyledTableRow>
            <StyledTableRow>
              <TableCell key="first" align="center" className={classes.indexRow}><b> Aliases: </b>  </TableCell>

              {columns.map((row, index) => (
                <StyledTableCell key={index.toString().concat('fifthRow')} align="left">

                  { row?.alias
                    ? <AliasDialog key={index.toString().concat('Alias')} column={row} />
                    : <div key={index.toString().concat('NoAlias')}>No Aliases</div>}

                </StyledTableCell>
              ))}
            </StyledTableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default DatasetSummaryOutputsTable;
