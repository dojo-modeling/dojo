import React, { useState } from 'react';

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import CollapseText from './CollapseText';

const useStyles = makeStyles((theme) => ({
  buttons: {
    backgroundColor: 'transparent',
    border: '2px solid black',
    color: 'black',
    padding: theme.spacing(1, 1, 1),
    margin: theme.spacing(1, 1, 1),
    cursor: 'pointer',
    '&:hover': {
      background: '#f8f8ff', // <- add here your desired color, for demonstration purposes I chose red
    }
  },

  paper: {
    position: 'absolute',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),

  },
}));

function GeographyListModal({ geography }) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };
  if (!geography?.country.length) {
    return (
      <Typography
        component="div"
        align="right"
      >
        No countries found
      </Typography>
    );
  }

  return (
    <div>

      <div align="right">
        <Button
          className={classes.buttons}
          onClick={() => setOpen(true)}
          align="right"
        >
          Detailed Admin Levels:
        </Button>

        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="simple-modal-title"
          aria-describedby="simple-modal-description"
        >
          <div>
            <Typography
              className={classes.header}
              component="h6"
              align="center"
            >
              <b> Countries: </b>
            </Typography>
            <Typography
              component="div"
            >
              <CollapseText childrenText={geography?.country.join(', ')} collapsedSize={65} />
            </Typography>
            {geography?.admin1?.length > 0
                    && (
                    <div>
                      <Typography
                        className={classes.header}
                        component="h6"
                        align="center"
                      >
                        <b> Admin 1: </b>
                      </Typography>
                      <Typography
                        component="div"
                      >
                        <CollapseText childrenText={geography?.admin1.join(', ')} collapsedSize={65} />
                      </Typography>
                    </div>
                    )}
            {geography?.admin2?.length > 0
                    && (
                    <div>
                      <Typography
                        className={classes.header}
                        component="h6"
                        align="center"
                      >
                        <b> Admin 2: </b>
                      </Typography>
                      <Typography
                        component="div"
                      >
                        <CollapseText childrenText={geography?.admin2.join(', ')} collapsedSize={65} />
                      </Typography>
                    </div>
                    )}
            {geography?.admin3?.length > 0
                && (
                <div>
                  <Typography
                    className={classes.header}
                    component="h6"
                    align="center"
                  >
                    <b> Admin 3: </b>
                  </Typography>
                  <Typography
                    component="div"
                  >
                    <CollapseText childrenText={geography?.admin3.join(', ')} collapsedSize={65} />
                  </Typography>
                </div>
                )}
          </div>
        </Dialog>
      </div>
    </div>
  );
}

export default GeographyListModal;
