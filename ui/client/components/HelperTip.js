import React, { useState } from 'react';

import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import Tooltip from '@material-ui/core/Tooltip';

import { darken, makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  root: {
    position: 'relative',
    // contain the width to the size of the content it is wrapping
    width: 'max-content',
  },
  icon: {
    fontSize: '0.9rem',
    opacity: '0.6',
    cursor: 'pointer',
    '&:hover': {
      opacity: '1',
    },
  },
  tooltip: {
    position: 'absolute',
    top: 0,
  },
}));

// position: before = helper icon comes before the content
// position: after = helper icon comes after the content
const HelperTip = ({
  title, children, position = 'after', dark
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);

    // close it after some time if it's still open
    setTimeout(() => handleTooltipClose(), 14000);
  };

  return (
    <div className={classes.root}>
      { position === 'after' && children }
      {/* this clickawaylistener handles closing the tooltip when we click
        anywhere else on the screen (except to open another tooltip) */}
      <ClickAwayListener onClickAway={handleTooltipClose}>
        <Tooltip
          title={title}
          className={classes.tooltip}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          onClose={handleTooltipClose}
          open={open}
          // slightly darker yellow for visibility on white backgrounds
          style={{ color: dark ? darken('#ffff00', 0.175) : '#ffff00' }}
          arrow
        >
          <HelpOutlineIcon
            fontSize="small"
            onClick={handleTooltipOpen}
            className={classes.icon}
            /* this stops the ripple effect if the HelperTip is on an MUI button */
            onMouseDown={(e) => e.stopPropagation()}
          />
        </Tooltip>
      </ClickAwayListener>
      { position === 'before' && children }
    </div>
  );
};

export default HelperTip;
