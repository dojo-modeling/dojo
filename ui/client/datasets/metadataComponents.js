import React, { useState } from 'react';
import { Form, Formik } from 'formik';

import isEmpty from 'lodash/isEmpty';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import axios from 'axios';
import Container from '@material-ui/core/Container';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import * as yup from 'yup';
import get from 'lodash/get';

import { withStyles } from '@material-ui/core/styles';
import { DomainsAutocomplete } from '../components/ModelDetailForm';

import { Navigation } from '.';
import { FormAwareTextField, FormAwareSelect } from './FormFields';

import { FileSelector } from './FileSelector';



/**
 * Uses already-defined validation schema to derive if a field is required
 * Used in this file by FormAwareTextField
 * */
const checkRequired = (fieldName) =>
      get(formSchema, `fields.${fieldName}.exclusiveTests.required`, false);

/**
 *
 **/
export const formSchema = yup.object({
  name: yup
    .string('Enter the Dataset name')
    .required('Please enter Dataset name.'),

  description: yup
    .string('Provide description of the dataset.')
    .required('Please enter a description.'),

  'registerer-name': yup
    .string('Registerer or Organization name')
    .required('Please enter a registerer name.'),

  'registerer-email': yup
    .string()
    .email('Please enter a valid e-mail')
    .required('Please enter the Registerer\'s e-mail address.'),

  'source-website': yup
    .string('Enter source website url.')
    .url('Source website must be a valid URL.'),

  file: yup
    .string('Select a filename to process.')
    .required('Registering a Dataset requires selecting a file.')
});

export const genRegisterDefaultValues = (datasetInfo) => ({
  name: datasetInfo?.name || '',
  description: datasetInfo?.description || '',
  domains: datasetInfo?.domains || [],
  'registerer-name': datasetInfo?.maintainer?.name || '',
  'registerer-email': datasetInfo?.maintainer?.email || '',
  'source-organization': datasetInfo?.maintainer?.organization || '',
  'source-website': datasetInfo?.maintainer?.website || '',
  temporal_resolution: datasetInfo?.temporal_resolution || 'annual',
  'x-resolution': get(datasetInfo, 'spatial_resolution[0]', ''),
  'y-resolution': get(datasetInfo, 'spatial_resolution[1]', ''),
  data_sensitivity: datasetInfo?.data_sensitivity || '',
  data_quality: datasetInfo?.data_quality || '',
  file: datasetInfo?.fileData?.raw?.url || undefined
});

/**
 * Uploads a file to the backend service.
 * Receives a form dom reference, datasetId, and optional params.
 **/
export const uploadFile = async (form, datasetID, params={}) => {

  const uploadData = new window.FormData();
  const formfile = form.file;
  const file = formfile.files[0];

  uploadData.append('file', file);

  const response = await axios({
    method: 'post',
    url: `/api/dojo/indicators/${datasetID}/upload`,
    data: uploadData,
    params: params
  });
  return response;
};

export const updateMetadata = async (datasetId, fileMetadataData, storeAnnotations) => {

  const payload = {
    metadata: {
      files: {
        [fileMetadataData.rawFileName]: fileMetadataData,
      }
    }
  };

  const response = await axios({
    method: 'patch',
    url: `/api/dojo/indicators/${datasetId}/annotations`,
    data: payload,
  });

  storeAnnotations(payload);

  return response.data;
};

/**
 *
 * */
const Section = withStyles(() => ({
  root: {
  }
}))(({ title, children, classes }) => (
  <section className={classes.root}>
    <Typography
      variant="h6"
      color="textSecondary"
      gutterBottom
    >
      {title}
    </Typography>

    {children}
  </section>
));


/**
 *
 * */
export const BaseData = (props) => {

  const {
    formik, error, isReadOnlyMode,
    datasetInfo, setDatasetInfo, fileMetadata, setFileMetadata,
    isUpdatingUploadedFile, setUpdatingUploadedFile, uploadedFilesData
  } = props;

  const displayUploadedFile = Boolean(datasetInfo?.fileData?.raw?.uploaded);

  return (
  <Section title="Data Information">
    <FormAwareTextField
      name="name"
      requiredFn={checkRequired}
      label="Name"
      placeholder="Dataset Name"
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="description"
      requiredFn={checkRequired}
      label="Description"
      placeholder="Provide a description of the dataset"
      multiline
      minRows="2"
      disabled={isReadOnlyMode}
    />

    <div style={{ margin: '0.5rem 0' }}>
      <DomainsAutocomplete
        formik={formik}
        label="Domains"
        textFieldProps={{
          placeholder: isEmpty(formik.values.domains) ? 'Select as many as appropriate' : '',
          InputLabelProps: { shrink: true }
        }}
        disabled={isReadOnlyMode}
      />
    </div>

    <FileSelector
      formik={formik}
      disabled={Boolean(error)}
      name="file"
      label="File Upload"
      requiredFn={checkRequired}
      datasetInfo={datasetInfo}
      setDatasetInfo={setDatasetInfo}
      fileMetadata={fileMetadata}
      setFileMetadata={setFileMetadata}
      displayUploadedFile={displayUploadedFile}
      isUpdatingUploadedFile={isUpdatingUploadedFile}
      setUpdatingUploadedFile={setUpdatingUploadedFile}
      uploadedFilesData={uploadedFilesData}
    />

  </Section>
)};

/**
 *
 * */
export const ContactInformation = ({isReadOnlyMode}) => (
  <Section title="Your Contact Information">
    <FormAwareTextField
      name="registerer-name"
      label="Registerer Name (Organization)"
      requiredFn={checkRequired}
      placeholder="Name of individual registering this dataset"
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="registerer-email"
      label="Registerer Email"
      requiredFn={checkRequired}
      placeholder="registerer@your_organization.org"
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="source-organization"
      label="Source Organization"
      requiredFn={checkRequired}
      placeholder="Primary organization(s) responsible for the source data"
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="source-website"
      label="Source Website"
      requiredFn={checkRequired}
      placeholder="http://source_organization.org/"
      disabled={isReadOnlyMode}
    />
  </Section>
);

/**
 *
 * */
export const Resolution = ({isReadOnlyMode}) => (
  <Section title="Resolution">

    <FormAwareSelect
      name="temporal_resolution"
      label="Temporal Resolution"
      options={[
        { value: 'annual', label: 'annual' },
        { value: 'monthly', label: 'monthly' },
        { value: 'weekly', label: 'weekly' },
        { value: 'daily', label: 'daily' },
        { value: 'dekad', label: 'dekad' },
        { value: 'other', label: 'other' },
      ]}
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="x-resolution"
      label="X Resolution (meters)"
      requiredFn={checkRequired}
      placeholder="Data spatial resolution in meters"
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="y-resolution"
      label="Y Resolution (meters)"
      requiredFn={checkRequired}
      placeholder="Data spatial resolution in meters"
      disabled={isReadOnlyMode}
    />
  </Section>
);

/**
 *
 * */
export const DataQualitySensitivity = ({isReadOnlyMode}) => (
  <Section title="Data Quality and Sensitivity">
    <FormAwareTextField
      name="data_sensitivity"
      label="Data Sensitivity"
      requiredFn={checkRequired}
      placeholder="Describe any restrictions on usage of this data, sensitivity associated with the data, or confidentiality concerns."
      multiline
      disabled={isReadOnlyMode}
    />

    <FormAwareTextField
      name="data_quality"
      label="Data Quality"
      requiredFn={checkRequired}
      placeholder="Specify if data is measured, derived, or estimated. Indicate any known data quality issues and/or describe data collection methodology."
      multiline
      disabled={isReadOnlyMode}
    />
  </Section>
);

