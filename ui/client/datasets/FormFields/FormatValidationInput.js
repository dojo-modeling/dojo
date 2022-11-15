import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Field, useField } from 'formik';

import memoize from 'lodash/memoize';

import { TextField } from 'material-ui-formik-components/TextField';

import InputAdornment from '@material-ui/core/InputAdornment';
import CheckCircleIcon from '@material-ui/icons/CheckCircleRounded';
import ErrorCircleIcon from '@material-ui/icons/ErrorRounded';
import identity from 'lodash/identity';


/**
 * Accepts a validate function and memoizes the validation logic,
 * as well as displays the Formik's form validation errors.
 * Encapsulates logic for displaying good/bad icons on custom validation.
 * */
export default withStyles(() => ({
  root: {
  },
  valid: {
    color: 'green'
  },
  invalid: {
    color: 'red'
  }
}))(({
  classes, validateFormat=identity, parentName, InputProps, ...props
}) => {

  // Would run on each form context change, blur, and render
  function validateAlways(value) {
    if (parentName) {
      return validateFormat(parentName, value);
    }
    return '';
  }

  // Redundant access to field data in order to create custom errors, too
  // Formik form errors will be added by Field, while our custom backend
  // validate will be added by useField
  const [field, meta, helpers] = useField(props.name);
  const valid = !Boolean(meta?.error);

  /**
   * We need to both memoize individual input values with `memoize`, as well
   * as "cache" the function using useCallback, so that it doesn't re-initialize and
   * lose the memoized values. We do this for 2 reasons:
   * a) So that we don't call the backend http validation unnecessarily
   * b) So that, when memoizing, we don't create new memoize function on each run and waste memory
   */
  const validate = React
        .useCallback(
          memoize(validateAlways),
          [parentName, field.value, field.name]);

  // Run validate on mount
  React.useEffect(() => {
    // validate returns a promise
    const validationResult = validate(field.value);

    // Also set touched to force error on mount:
    helpers.setTouched(true, true);

    Promise
      .resolve(validationResult)
      .then((invalid) => {
        if (invalid) {
          helpers.setError(invalid);
        }
      });
  }, []);

  return (
    <Field
      validate={validate}
      className={classes.root}
      component={TextField}
      variant="outlined"
      fullWidth
      margin="dense"
      InputLabelProps={{ shrink: true }}
      InputProps={{
        endAdornment: field.value && (
          <InputAdornment position="end">
            {valid ? (
              <CheckCircleIcon className={classes.valid} />
            ) : (
              <ErrorCircleIcon className={classes.invalid} />
            )}
          </InputAdornment>
        ),
        style: { borderRadius: 0 },
        ...InputProps
      }}
      {...props}
    />
  );

});
