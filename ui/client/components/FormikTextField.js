import React from 'react';

import { TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import get from 'lodash/get';

const useStyles = makeStyles((theme) => ({
  root: {
    margin: [[theme.spacing(1), 0]],
  },
}));
function FormikTextField({
  name, label, formik, disabled, ...props
}) {
  const classes = useStyles();
  // apply our three default props to make the default formik textfield
  // and then any other MUI TextField props passed in are spread with ...props
  return (
    <TextField
      /* eslint-disable react/jsx-props-no-spreading */
      {...props}
      InputProps={{ autoComplete: 'off' }}
      className={classes.root}
      data-test={`modelForm-${name}`}
      fullWidth
      id={name}
      name={name}
      disabled={disabled}
      label={label}
      /* Use lodash.get() to handle nested object names, eg 'maintainer.website' */
      value={get(formik, `values.${[name]}`)}
      onChange={formik.handleChange}
      error={
        get(formik, `touched.${[name]}`, null) && Boolean(get(formik, `errors.${[name]}`, null))
      }
      helperText={get(formik, `touched.${[name]}`, null) && get(formik, `errors.${[name]}`, null)}
    />
  );
}

export default FormikTextField;
