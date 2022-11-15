import React from 'react';

import MuiAutocomplete from '@material-ui/lab/Autocomplete';
import TextField from '@material-ui/core/TextField';

/**
 *
 * */
const Autocomplete = ({
  values, setValues, options, label, textFieldProps, disabled=false
}) => (options.length > 0
  ? (
    <MuiAutocomplete
      disabled={disabled}
      multiple
      value={values}
      options={options}
      onChange={(evt, val) => {
        if (val) {
          setValues(val);
        }
      }}
      onBeforeInput={(evt) => {
        if (evt.nativeEvent?.type === 'keypress' && evt.nativeEvent.keyCode === 13) {
          evt.preventDefault();
          evt.stopPropagation();
        }
      }}
      renderInput={(params) => (
        <TextField
          {...textFieldProps}
          {...params}
          variant="outlined"
          label={label}
        />
      )}
    />
  )
  : (
    <TextField
      disabled
      variant="outlined"
      value={`No ${label}`}
      fullWidth
    />
  ));
Autocomplete.displayName = 'Autocomplete';

export default Autocomplete;
