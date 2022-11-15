import React, { useEffect } from 'react';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import { ExternalLink } from '../../components/Links';
import { FormAwareSelect } from '../FormFields';
import FormatValidationInput from '../FormFields/FormatValidationInput';

/**
 *
 * */
const MultiColumnDateSelector = ({
  columns, editingColumn, setFieldValue,
  validateDateFormat, values, disabled=false
}) => {
  const columnOptions = columns.map((column) => ({
    value: column.field,
    label: column.headerName
  }));

  // This needs to run only when changing the type|base, as
  // we hardcode the column's value (year|month|day) to the columName being edited
  // and even disable that field (see disabled prop on the react tree below).
  useEffect(() => {
    if (!disabled) {
      // If we allow editing, we auto-set the "base" column name as its default date_type
      const target = editingColumn.name;
      setFieldValue([`date.multi-column.${editingColumn.date_type}`], target);
    }
  }, [editingColumn.date_type, values.multiPartBase]);

  const formatProps = {
    validateFormat: validateDateFormat,
    required: true,
    margin: 'dense'
  };

  return (
    <FormControl>
      <FormGroup>
        <Typography variant="caption">
          <ExternalLink href="https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes">
            Date Formatting Referece
          </ExternalLink>
        </Typography>

        <Grid
          container
          spacing={2}
        >

          <Grid item xs={6}>
            <FormAwareSelect
              name="['date.multi-column.year']"
              label="Year"
              required
              disabled={disabled || (editingColumn.date_type === 'year')}
              options={columnOptions}
            />
          </Grid>

          <Grid item xs={6}>
            <FormatValidationInput
              label="Year Format"
              name="['date.multi-column.year.format']"
              parentName={values['date.multi-column.year']}
              {...formatProps}
            />
          </Grid>

          <Grid item xs={6}>
            <FormAwareSelect
              name="['date.multi-column.month']"
              label="Month"
              disabled={disabled || (editingColumn.date_type === 'month')}
              required
              options={columnOptions}
            />
          </Grid>
          <Grid item xs={6}>
            <FormatValidationInput
              label="Month Format"
              name="['date.multi-column.month.format']"
              parentName={values['date.multi-column.month']}
              {...formatProps}
            />
          </Grid>

          <Grid item xs={6}>
            <FormAwareSelect
              name="['date.multi-column.day']"
              label="Day"
              disabled={disabled || (editingColumn.date_type === 'day')}
              required
              options={columnOptions}
            />
          </Grid>

          <Grid item xs={6}>
            <FormatValidationInput
              label="Day Format"
              name="['date.multi-column.day.format']"
              parentName={values['date.multi-column.day']}
              {...formatProps}
            />
          </Grid>
        </Grid>
      </FormGroup>
    </FormControl>
  );
};

export default MultiColumnDateSelector;
