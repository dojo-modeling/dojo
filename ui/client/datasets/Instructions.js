import React, { useState } from 'react';
import { withStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';

import Grid from '@material-ui/core/Grid';

import InfoIcon from '@material-ui/icons/Info';
import TimelineIcon from '@material-ui/icons/Timeline'; // feature
import LanguageIcon from '@material-ui/icons/Language'; // geo
import EventIcon from '@material-ui/icons/Event'; // date

import Popover from '@material-ui/core/Popover';
import Typography from '@material-ui/core/Typography';

export default withStyles((theme) => ({
  popoverContent: {
    padding: theme.spacing(2),
    background: theme.palette.common.white,
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: 4
  },
  legendList: {
    paddingInlineStart: '1rem',
    marginTop: 5,

    '& li': {
      display: 'flex',
      alignItems: 'center',
      lineHeight: '2rem',
      margin: '0.5rem 0',
    }
  },
  statusBadge: {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText,
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.6rem',
    width: '48px',
    marginRight: theme.spacing(1),
  },
  statusBadgeItem: {
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    color: '#23b26b',
  },
}))(({ classes }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick}>
        <InfoIcon />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <div className={classes.popoverContent}>

          <Typography variant="h5">
            Guide
          </Typography>

          <Typography
            variant="body1"
            component="div"
          >
            <p>
              Annotate Features, Geo, and Date columns before proceeding.
              Click on a column to start.
            </p>
            <p>
              Only annotate columns of interest. Typically includes at least one date column,
              one geo column, and one or more feature columns.
            </p>
            <p>
              During our analysis process, we attempted to automatically infer feature
              types, detect geographic information, and identify temporal information.
            </p>

            <Typography variant="h6">
              Legend
            </Typography>

            <ul className={classes.legendList}>
              {/* TODO import these styled/colored icons from common file */}
              <Grid container>
                <Grid item xs={12} md={6}>
                  <li>
                    <LanguageIcon className={classes.icon} />
                    &nbsp; Annotated Geo field
                  </li>
                  <li>
                    <EventIcon className={classes.icon} />
                    &nbsp; Annotated Date field
                  </li>
                  <li>
                    <TimelineIcon className={classes.icon} />
                    &nbsp; Annotated Feature field
                  </li>

                </Grid>
                <Grid item xs={12} md={6}>
                  <li className={classes.statusBadgeItem}>
                    <Typography
                      component="span"
                      variant="caption"
                      className={classes.statusBadge}
                      align="center"
                    >
                      inferred
                    </Typography>
                    <span>Column with inferred type data</span>
                  </li>
                  <li className={classes.statusBadgeItem}>
                    <Typography
                      component="span"
                      variant="caption"
                      className={classes.statusBadge}
                      align="center"
                    >
                      primary
                    </Typography>
                    <span>Primary Date or Geo field</span>
                  </li>
                  <li className={classes.statusBadgeItem}>
                    <Typography
                      component="span"
                      variant="caption"
                      className={classes.statusBadge}
                      align="center"
                    >
                      qualifier
                    </Typography>
                    <span>Qualifies another annotated column</span>
                  </li>

                </Grid>
              </Grid>
            </ul>
          </Typography>
        </div>
      </Popover>
    </>
  );
});
