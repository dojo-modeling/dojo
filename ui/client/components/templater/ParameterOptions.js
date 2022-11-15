import React from 'react';

import { Field, FieldArray } from 'formik';

import isEmpty from 'lodash/isEmpty';

import { TextField } from 'material-ui-formik-components';

import AddCircleIcon from '@material-ui/icons/AddCircle';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Typography from '@material-ui/core/Typography';

import { withStyles } from '@material-ui/core/styles';

const ParameterOptions = withStyles((theme) => ({
  root: {
    width: '100%',
  },
  subtextWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: [[0, theme.spacing(2), theme.spacing(1)]],
  },
  addButton: {
    minWidth: '120px',
    paddingLeft: theme.spacing(1),
  },
  subtext: {
    maxWidth: '300px',
  },
}))(({ classes, options }) => (
  <FieldArray
    name="options"
    render={(arrayHelpers) => (
      <div className={classes.root}>
        <List dense>
          {options && !isEmpty(options) && options.map((option, index) => (
            // using the index is what the formik docs use for this, even though one
            // would expect it to cause issues with re-rendering when you remove items
            // eslint-disable-next-line react/no-array-index-key
            <ListItem key={index}>
              <Field
                name={`options.${index}`}
                margin="dense"
                label={`#${index + 1}`}
                variant="outlined"
                component={TextField}
              />
              <IconButton
                onClick={() => arrayHelpers.remove(index)}
                color="secondary"
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <div className={classes.subtextWrapper}>
          <Typography variant="caption" className={classes.subtext}>
            Make sure that the choices you specify are valid values for this parameter
          </Typography>
          <Button
            className={classes.addButton}
            color="primary"
            onClick={() => arrayHelpers.push('')}
            size="small"
            startIcon={<AddCircleIcon />}
          >
            Add Option
          </Button>
        </div>
      </div>
    )}
  />
));

export default ParameterOptions;
