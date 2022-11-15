import React from 'react';

import TextField from '@material-ui/core/TextField';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';

import { Select } from 'material-ui-formik-components/Select';

import { withStyles } from '@material-ui/core/styles';
import { Field, getIn, useField } from 'formik';
import isFunction from 'lodash/isFunction';
import get from 'lodash/get';

/**
 * All Form-Aware fields in this directory need to be nested within a Formik's
 * <Formik> <Form> anywhere in the parent react tree.
 * */

/**
 * Text input field that is aware of Formik's Form.
 * Needs to be nested within <Formik><Form> from a parent
 * within the React Tree context.
 * */
export const FormAwareTextField = withStyles((theme) => ({
  root: {
    margin: [[theme.spacing(1), 0]],

    '& .MuiFormHelperText-root': {
      marginLeft: 7,
      marginRight: 5,
    }
  },
}))(({
  classes, name, label, requiredFn, placeholder, inputProps={}, InputProps={}, required, ...props
}) => {
  const [field, meta] = useField({ ...props, name });

  return (
    <TextField
      className={classes.root}
      label={label}
      variant="outlined"
      fullWidth
      InputLabelProps={{ shrink: true }}
      InputProps={{
        style: { borderRadius: 0 },
        ...InputProps
      }}
      inputProps={{
        'aria-label': label,
        ...inputProps
      }}
      {...field}
      placeholder={placeholder}
      helperText={get(meta, 'touched') && get(meta, 'error')}
      error={get(meta, 'error') && get(meta, 'touched')}
      required={required || (isFunction(requiredFn) ? requiredFn(name) : false)}
      {...props}
    />
  );
});

/**
 *
 * */
const FormikCheckbox = withStyles((theme) => ({
  root: {
  },
  helperText: {
    marginTop: -6,
    color: `${theme.palette.grey[600]} !important`
  }
}))((props) => {
  const {
    label,
    field,
    form: { touched, errors, setFieldValue },
    required,
    fullWidth,
    margin,
    helperText,
    classes,
    ...other
  } = props;

  const errorText = getIn(errors, field.name);
  const touchedVal = getIn(touched, field.name);
  const hasError = touchedVal && errorText !== undefined;

  const controlProps = {
    checked: field.value || false,
    color: 'primary',
    onChange: (event) => {
      setFieldValue(field.name, event.target.checked);
    },
  };

  return (
    <FormControl
      className={classes.root}
      fullWidth={fullWidth}
      required={required}
      error={hasError}
      {...other}
    >
      <FormControlLabel
        margin={margin}
        control={<Checkbox aria-label={label} {...controlProps} />}
        label={label}
      />
      {helperText && <FormHelperText className={classes.helperText}>{helperText}</FormHelperText>}
      {hasError && <FormHelperText>{errorText}</FormHelperText>}
    </FormControl>
  );
});
FormikCheckbox.defaultProps = {
  required: false,
  fullWidth: true,
  margin: 'dense',
};

/**
 *
 * */
export const FormAwareCheckBox = (props) => (
  <Field
    {...props}
    component={FormikCheckbox}
  />
);

/**
 *
 * */
export const FormAwareSelect = ({ InputProps = {}, InputLabelProps = {}, inputProps={}, ...props }) => (
  <Field
    {...props}
    margin="dense"
    variant="outlined"
    fullWidth
    InputProps={{
      ...InputProps,
      style: { borderRadius: 0 }
    }}
    inputProps={{
      'aria-label': props.label,
      ...inputProps
    }}
    InputLabelProps={{
      shrink: true,
      ...InputLabelProps,
    }}
    component={Select}
  />
);
