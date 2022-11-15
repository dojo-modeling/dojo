import React, { useCallback } from 'react';

import _values from 'lodash/values';

import { RadioGroup } from 'material-ui-formik-components/RadioGroup';
import { Switch } from 'material-ui-formik-components/Switch';
import { withStyles } from '@material-ui/core/styles';
import { Field } from 'formik';
import Typography from '@material-ui/core/Typography';

import { Aliases } from './Aliases';
import Autocomplete from '../../components/Autocomplete';
import { FormAwareCheckBox, FormAwareSelect, FormAwareTextField } from '../FormFields';

import FormatValidationInput from '../FormFields/FormatValidationInput';
import MultiColumnDateSelector from './MultiColumnDateSelector';
import MultiColumnGeoSelector from './MultiColumnGeoSelector';

import { ExternalLink } from '../../components/Links';
import { removeSelf } from './annotationRules';
import { GEO_ADMINS } from './constants';

/**
 *
 * */
export const FeatureControls = ({ values, fieldsConfig }) => (
  <>
    <FormAwareSelect
      name="feature_type"
      label="Data Type"
      options={[
        { value: 'float', label: 'Float' },
        { value: 'int', label: 'Int' },
        { value: 'str', label: 'String' },
        { value: 'binary', label: 'Binary' },
        { value: 'boolean', label: 'Boolean' },
      ]}
      {...fieldsConfig('feature_type')}
    />

    <FormAwareTextField
      name="units"
      margin="dense"
      label="Units"
      required
      placeholder=""
      {...fieldsConfig('units')}
    />

    <FormAwareTextField
      name="units_description"
      margin="dense"
      label="Unit Description"
      placeholder=""
      {...fieldsConfig('units_description')}
    />

    <Aliases
      aliases={values.aliases}
      {...fieldsConfig('aliases')}
    />

  </>
);

/**
 *
 * */
export const GeoControls = ({
  values, columns, editingColumnName, setFieldValue, fieldsConfig
}) => {
  const isCoorPairCandidate = ['latitude', 'longitude']
    .includes(values.geo_type);
  // country, state/territory, county/district:
  const isResolveGADMCandidate = [GEO_ADMINS.admin0, GEO_ADMINS.admin1, GEO_ADMINS.admin2]
    .includes(values.geo_type);

  const isCoordinatesLocation = values.geo_type === 'coordinates'
        || values['geo.coordinate-pair'];

  const isMultiColumnCandidate = _values(GEO_ADMINS).includes(values.geo_type);
  const isMultiColumn = values['geo.multi-column'];
  const isSavedMultiPartRelationship = Boolean(values.multiPartBase);

  // Multi-admin multi-column geos (build a geo) HAVE to be primary in order for the backend
  // to save correctly, and the UI to load back in correctly
  React.useEffect(() => {
    if (isMultiColumn) {
      setFieldValue('primary', true);
    }
  }, [isMultiColumn, values.category]);

  return (
    <>
      <FormAwareSelect
        name="geo_type"
        label="Format"
        options={[
          { value: 'latitude', label: 'Latitude' },
          { value: 'longitude', label: 'Longitude' },
          { value: 'coordinates', label: 'Coordinates' },
          { value: GEO_ADMINS.admin0, label: 'Country (Admin0)' },
          { value: 'iso2', label: 'ISO2' },
          { value: 'iso3', label: 'ISO3' },
          { value: GEO_ADMINS.admin1, label: 'State/Territory (admin1)' },
          { value: GEO_ADMINS.admin2, label: 'County/District (admin2)' },
          { value: GEO_ADMINS.admin3, label: 'Municipality/Town (admin3)' },
        ]}
        disabled={isSavedMultiPartRelationship}
        {...fieldsConfig('geo_type')}
      />

      {values.geo_type === 'coordinates' && (
        <Field
          name="coord_format"
          label="Coordinate Format"
          component={RadioGroup}
          options={[
            { value: 'lonlat', label: 'Longitude,Latitude' },
            { value: 'latlon', label: 'Latitude,Longitude' },
          ]}
          {...fieldsConfig('coord_format')}
        />
      )}

      <FormAwareCheckBox
        name="primary"
        label="This is my primary geo field"
        helperText="There can only be one primary geo field."
        disabled={values['geo.multi-column']}
        {...fieldsConfig('primary')}
      />

      <FormAwareCheckBox
        name="resolve_to_gadm"
        label="Resolve to GADM"
        disabled={!isResolveGADMCandidate}
        {...fieldsConfig('resolve_to_gadm')}
      />

      {isCoorPairCandidate && (
        <FormAwareCheckBox
          name="['geo.coordinate-pair']"
          label="This is part of a coordinate pair"
          disabled={isSavedMultiPartRelationship}
          {...fieldsConfig('geo.coordinate-pair')}
        />
      )}

      {isCoorPairCandidate && Boolean(values['geo.coordinate-pair']) && (
        <FormAwareSelect
          name="['geo.coordinate-pair-column']"
          label="Associated Coordinate Column"
          disabled={isSavedMultiPartRelationship}
          options={
            removeSelf(columns, editingColumnName)
              .map((column) => ({
                value: column.field,
                label: column.headerName
              }))
          }
          {...fieldsConfig('geo.coordinate-pair-column')}
        />
      )}

      {isMultiColumnCandidate && (
        <FormAwareCheckBox
          name="['geo.multi-column']"
          label="This field is a part of a multi-column admin geo (always primary)"
          disabled={isSavedMultiPartRelationship}
          {...fieldsConfig('geo.multi-column')}
        />
      )}

      {isMultiColumnCandidate && isMultiColumn && (
        <MultiColumnGeoSelector
          columns={columns}
          editingColumn={{
            name: editingColumnName,
            geo_type: values.geo_type,
          }}
          disabled={isSavedMultiPartRelationship}
          setFieldValue={setFieldValue}
          values={values}
          fieldsConfig={fieldsConfig}
        />
      )}

      {values.primary && isCoordinatesLocation && (
        <FormAwareSelect
          name="gadm_level"
          label="Geocoding Level"
          options={[
            { value: 'admin3', label: 'admin3' },
            { value: 'admin2', label: 'admin2' },
            { value: 'admin1', label: 'admin1' },
            { value: 'country', label: 'Country (Admin0)' },
          ]}
          {...fieldsConfig('gadm_level')}
        />
      )}

    </>
  );
};

/**
 *
 * */
export const DateControls = ({
  columns, values, editingColumnName,
  setFieldValue, validateDateFormat,
  fieldsConfig
}) => {
  const isMultiColumnCandidate = ['year', 'month', 'day'].includes(values.date_type);
  const isMultiColumn = values['date.multi-column'];
  const requiresFormatting = values.date_type !== 'epoch' && !isMultiColumn;

  const isSavedMultiPartRelationship = Boolean(values.multiPartBase);

  return (
    <>
      <FormAwareSelect
        name="date_type"
        label="Time Subcategory"
        options={[
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
          { value: 'day', label: 'Day' },
          { value: 'epoch', label: 'Epoch' },
          { value: 'date', label: 'Date' },
        ]}
        disabled={isSavedMultiPartRelationship}
        {...fieldsConfig('date_type')}
      />

      <FormAwareCheckBox
        name="primary"
        label="This is my primary date field"
        helperText="There can only be one primary date field."
        {...fieldsConfig('primary')}
      />

      {isMultiColumnCandidate && (
        <FormAwareCheckBox
          name="['date.multi-column']"
          label="This field is a part of a multi-column date"
          disabled={isSavedMultiPartRelationship}
          {...fieldsConfig('date.multi-column')}
        />
      )}

      {isMultiColumnCandidate && isMultiColumn && (
        <MultiColumnDateSelector
          columns={columns}
          editingColumn={{
            name: editingColumnName,
            format: values.time_format,
            date_type: values.date_type
          }}
          disabled={isSavedMultiPartRelationship}
          values={values}
          setFieldValue={setFieldValue}
          validateDateFormat={validateDateFormat}
          fieldsConfig={fieldsConfig}
        />
      )}

      {requiresFormatting && (
        <div style={{paddingTop: '0.5rem'}}>
          <FormatValidationInput
            name="time_format"
            required
            label="Date Format"
            validateFormat={validateDateFormat}
            parentName={editingColumnName}
            {...fieldsConfig('time_format')}
          />
          <Typography variant="caption">
            <ExternalLink href="https://docs.python.org/3/library/datetime.html#strftime-and-strptime-format-codes">
              Date Formatting Referece
            </ExternalLink>
          </Typography>
        </div>
      )}

    </>
  );
};

const widgets = {
  feature: FeatureControls,
  geo: GeoControls,
  time: DateControls
};

/**
 *
 * */
export const ColumnAnnotation = withStyles((theme) => ({
  root: {
  },
  qualifies: {
    padding: theme.spacing(1)
  }
}))(({
  classes, editingColumnName, columns,
  values, setFieldValue, validateDateFormat,
  annotatedColumns, fieldsConfig=()=>({})
}) => {

  const displayNamePlaceholder = editingColumnName.includes('+') ? '' : editingColumnName;
  const setQualifiesValues = useCallback(
    (val) => {
      setFieldValue('qualifies', val);
    },
    [setFieldValue]
  );

  const TypeWidget = widgets[values?.category];

  return (
    <div className={classes.root}>

      <FormAwareTextField
        margin="dense"
        name="display_name"
        label="Display Name"
        placeholder={displayNamePlaceholder}
        {...fieldsConfig('display_name')}
      />

      <FormAwareSelect
        name="category"
        label="Type"
        inputProps={{
          'aria-label': 'type'
        }}
        options={[
          { value: 'feature', label: 'Feature' },
          { value: 'geo', label: 'Geo' },
          { value: 'time', label: 'Date' },
        ]}
        {...fieldsConfig('category')}
      />

      <FormAwareTextField
        name="description"
        margin="dense"
        label="Description"
        placeholder=""
        multiline
        required
        minRows="2"
        {...fieldsConfig('description')}
      />

      <TypeWidget
        values={values}
        columns={columns}
        editingColumnName={editingColumnName}
        setFieldValue={setFieldValue}
        validateDateFormat={validateDateFormat}
        fieldsConfig={fieldsConfig}
      />

      <Field
        name="isQualifies"
        label="Field Qualifies Another"
        component={Switch}
        {...fieldsConfig('isQualifies')}
      />

      {values?.isQualifies && (
        <div className={classes.qualifies}>
          <Autocomplete
            label="Columns to Qualify"
            options={removeSelf(annotatedColumns, editingColumnName)
              .map((c) => c.headerName)}
            values={values.qualifies}
            setValues={setQualifiesValues}
            {...fieldsConfig('qualifies')}
          />

          <br />

          <FormAwareSelect
            name="qualifierrole"
            label="Qualifier Role"
            options={[
              { value: 'breakdown', label: 'Breakdown (default)' },
              { value: 'weight', label: 'Weight' },
              { value: 'minimum', label: 'Minimum' },
              { value: 'maximum', label: 'Maximum' },
              { value: 'coefficient', label: 'Coefficient of Variation' },
            ]}
            {...fieldsConfig('qualifierrole')}
          />
        </div>
      )}

    </div>
  );
});
ColumnAnnotation.displayName = 'ColumnAnnotation';
