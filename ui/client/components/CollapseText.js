import React, { useEffect, useRef, useState } from 'react';

import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';

const CollapseText = ({ childrenText, collapsedSize = 60 }) => {
  const [display, setDisplay] = useState(false);
  const cellValue = useRef(null);
  const wrapper = useRef(null);
  const [currentlyOverflown, setCurrentlyOverflown] = useState(false);

  const handleClick = () => {
    setDisplay((prev) => !prev);
  };

  useEffect(() => {
    const isOverflown = (el) => (
      el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
    );
    const handleCheckTextSize = () => {
      const overflown = isOverflown(cellValue.current);
      setCurrentlyOverflown(overflown);
    };

    handleCheckTextSize();
  }, []);

  // todo: only show collapse if content is over a certain height
  return (
    <div ref={wrapper}>
      <div>
        <Collapse
          innerRef={cellValue}
          in={display}
          collapsedSize={collapsedSize}
        >
          {childrenText}
        </Collapse>
        { currentlyOverflown

          && (
          <div>

            <Box textAlign="center">
              <Tooltip title={`${display ? 'Hide' : 'Expand'} content`} arrow>
                <IconButton size="small" onClick={handleClick}>
                  {display ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Tooltip>
            </Box>
          </div>
          )}
      </div>
    </div>
  );
};

export default CollapseText;
