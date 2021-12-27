import React from 'react';

import Card from '@material-ui/core/Card';
import EditIcon from '@material-ui/icons/Edit';
import IconButton from '@material-ui/core/IconButton';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import Typography from '@material-ui/core/Typography';

import { makeStyles, useTheme } from '@material-ui/core/styles';

import { useDirective } from './SWRHooks';

const useStyles = makeStyles((theme) => ({
  card: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    padding: [[theme.spacing(1), theme.spacing(2), '10px']],
  },
  nextIcon: {
    color: 'yellow',
    marginRight: '4px',
    verticalAlign: '-.3em',
  },
}));

const DirectiveBox = ({
  disableClick, handleClick, modelId, summaryPage
}) => {
  const classes = useStyles();
  const theme = useTheme();

  const { directive, directiveLoading } = useDirective(modelId);

  if (!modelId) return null;

  if (directiveLoading) {
    return <Typography variant="body2" align="center">Loading Execution Directive</Typography>;
  }

  return (
    <Card
      className={classes.card}
      style={{
        backgroundColor: summaryPage ? theme.palette.grey[400] : 'rgba(68, 93, 110, .5)',
        color: summaryPage ? theme.palette.text.secondary : '#fff',
      }}
    >
      <span>
        {!summaryPage && <Typography variant="subtitle1">Model Execution Directive:</Typography>}
        <NavigateNextIcon className={classes.nextIcon} />
        {directive?.command.split(/{{ | }}/).map((obj, i) => (
          (i % 2 === 0)
            // Part of the directive that is not a parameter
            // disable this rule here because we're combining the index with chunk of string
            // eslint-disable-next-line react/no-array-index-key
            ? <Typography variant="subtitle1" component="span" key={`${obj}+${i}`}>{obj}</Typography>
            : (
              // A parameterized variable, sets the color of the text to red
              // TODO: UI can probably be improved
              // eslint-disable-next-line react/no-array-index-key
              <Typography variant="subtitle1" component="span" color="error" key={`${obj}+${i}`}>
                &#123;&#123;
                {obj}
                &#125;&#125;
              </Typography>
            )
        ))}
      </span>
      { (summaryPage && directive?.command) && (
        <IconButton
          component="span"
          onClick={() => handleClick()}
          disabled={disableClick}
        >
          <EditIcon />
        </IconButton>
      )}
    </Card>
  );
};

export default DirectiveBox;
