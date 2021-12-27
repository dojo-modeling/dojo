import React, { useEffect, useState } from 'react';

import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Card from '@material-ui/core/Card';
import IconButton from '@material-ui/core/IconButton';
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  card: {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    padding: [[theme.spacing(1), theme.spacing(2), '10px']],
    whiteSpace: 'nowrap',
  },
  mainWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  tileContainer: {
    overflow: 'auto',
    fontSize: '10px',
    height: '100%',
    paddingBottom: theme.spacing(1),
    '& > *': {
      marginRight: '2px',
    },
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'center',
    '& > :first-child': {
      paddingTop: '10px',
    },
  },
  contentContainer: {
    // https://css-tricks.com/flexbox-truncated-text/
    minWidth: 0,
  },
}));

// this is broken out into its own component so it can toggle its own open/closed state
function FileParams({ params, name }) {
  const classes = useStyles();
  const [showParams, setShowParams] = useState(false);

  return (
    <div>
      <IconButton onClick={() => setShowParams(!showParams)} size="small">
        {showParams ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
      </IconButton>
      <Typography variant="caption">
        {showParams ? 'Hide' : 'Show'} {name === 'Config' ? 'Parameters' : 'Output Variables'}
      </Typography>
      {showParams && params.map((param) => (
        <div key={param.id} className={classes.contentContainer}>
          <Tooltip title={param.description} arrow>
            <Typography variant="caption" noWrap>{param.display_name}</Typography>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

export default function FileCardList({
  name, files, loading, error, primaryClickHandler, primaryIcon, cardContent, disableClick,
  secondaryClickHandler, secondaryIcon, parameters
}) {
  const [expanded, setExpanded] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    if (loading || error || !files.length) {
      setExpanded(true);
    }
  }, [loading, error, files]);

  const getMatchingConfig = (file) => (
    // match up the config based on the file path
    parameters.filter((param) => param.template.path === file.path)
  );

  const getMatchingOutput = (file) => (
    // match up the output file based on the output file uuid
    parameters.filter((param) => param.uuid === file.id)
  );

  const displayCards = () => {
    if (loading) {
      return <Typography variant="body2" align="center">{`Loading ${name} Files...`}</Typography>;
    }

    if (error) {
      return (
        <Typography variant="body2" align="center">
          {`There was an error loading ${name.toLowerCase()} files`}
        </Typography>
      );
    }

    if (!files.length) {
      return (
        <Typography variant="body2" align="center">
          {`No ${name.toLowerCase()} files found`}
        </Typography>
      );
    }

    if (expanded) {
      return (
        <div
          className={classes.tileContainer}
        >
          {files.map((file) => (
            <Card
              key={file.id}
              className={classes.card}
            >
              <div className={classes.mainWrapper}>
                <div className={classes.contentContainer}>
                  {cardContent(file)}
                </div>
                <span>
                  <IconButton
                    component="span"
                    onClick={() => primaryClickHandler(file)}
                    disabled={disableClick}
                  >
                    {primaryIcon}
                  </IconButton>
                  { secondaryIcon && (
                  <IconButton
                    component="span"
                    onClick={() => secondaryClickHandler(file)}
                    disabled={disableClick}
                  >
                    {secondaryIcon}
                  </IconButton>
                  )}
                </span>
              </div>

              {parameters && (
                <FileParams
                  file={file}
                  name={name}
                  params={name === 'Config' ? getMatchingConfig(file) : getMatchingOutput(file)}
                />
              )}
            </Card>
          ))}
        </div>
      );
    }
  };

  return (
    <>
      <span className={classes.headerContainer}>
        <Typography
          align="center"
          color="textSecondary"
          variant="h6"
          gutterBottom
        >
          {`${name} Files`}
        </Typography>
        <IconButton onClick={() => setExpanded((prevExpanded) => !prevExpanded)}>
          { expanded ? <RemoveCircleOutlineIcon /> : <AddCircleOutlineIcon />}
        </IconButton>
      </span>
      {displayCards()}
    </>
  );
}
