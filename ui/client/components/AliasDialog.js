import React, { useState } from 'react';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  buttons: {
    backgroundColor: '#C8C8C8',
  },
  spanSpacing: {
    marginRight: '10px',
  },
}));

function AliasDialog({ column }) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>

      <Button
        className={classes.buttons}
        onClick={() => setOpen(true)}
      >
        Aliases:

      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >

        <div>

          {column?.alias
            && (
            <div style={{ padding: '20px' }}>
              <Typography
                className={classes.header}
                component="h6"
                align="center"
              >
                <b>{column.name.toUpperCase()}</b> <br /> Aliases:
              </Typography>
              <br />
              <ul style={{ padding: '10px' }}>

                {Object.keys(column?.alias).map((keyValue) => (
                  <li key={keyValue.toString().concat('aliases')}>
                    <span className={classes.spanSpacing}>
                      <b>Current : </b>
                      {keyValue.toString()}
                    </span>
                    <b>New : </b>
                    {column.alias[keyValue].toString()}
                  </li>
                ))}

              </ul>
            </div>
            )}

        </div>
      </Dialog>

    </div>
  );
}

export default AliasDialog;
