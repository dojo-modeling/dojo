/* eslint-disable camelcase */

import React from 'react';

import { Field } from 'formik';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { Select, TextField } from 'material-ui-formik-components';

import { makeStyles } from '@material-ui/core/styles';

import HelperTip from '../HelperTip';
import { isNum, patchOptions } from './runnerTools';

const makeOptionConverter = (type, option) => ({
  label: option,
  value: isNum(type) ? Number(option) : option
});

const useStyles = makeStyles(() => ({
  runField: {
    display: 'flex',
    flexDirection: 'column',
  },
  fieldHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
}));

const RunnerParameter = ({
  default_value,
  description,
  name,
  options,
  predefined,
  type,
  unit,
  unit_description,
  min,
  max,
}) => {
  const classes = useStyles();
  const minWarning = min ? `'${name}' ≥ ${min}.` : '';
  const maxWarning = max ? `'${name}' ≤ ${max}.` : '';
  const limitWarning = min + max ? `${minWarning} ${maxWarning}` : undefined;
  return (
    <ListItem
      key={name}
      className={classes.runField}
      alignItems="flex-start"
    >
      <div className={classes.fieldHeader}>
        <ListItemText
          primary={description}
          secondary={limitWarning}
        />
        <HelperTip
          title={`${unit}: ${unit_description}`}
          dark
        />
      </div>
      <Field
        name={name}
        margin="dense"
        label={`${name} (${unit})`}
        variant="outlined"
        component={predefined ? Select : TextField}
        options={predefined
          ? patchOptions(options, default_value).map(
            (option) => makeOptionConverter(type, option)
          ) : undefined}
      />
    </ListItem>
  );
};

export default RunnerParameter;
