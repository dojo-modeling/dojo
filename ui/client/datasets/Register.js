import React, { useState } from 'react';
import { Form, Formik } from 'formik';

import { withStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import axios from 'axios';
import Container from '@material-ui/core/Container';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';

import { Navigation } from '.';

import {
  uploadFile, genRegisterDefaultValues,
  formSchema, updateMetadata,
  BaseData, ContactInformation,
  Resolution, DataQualitySensitivity
} from './metadataComponents';

const skipValidation = false;

/**
 * Dataset Registration landing page (fileMetadata, file upload).
 * */


/**
 *
 * */
export default withStyles(({ spacing }) => ({
  root: {
    padding: [[spacing(4), spacing(4), spacing(2), spacing(4)]],
  },
  header: {
    marginBottom: spacing(6),
  },
  accordion: {
    margin: '1.5rem 0 2rem 0'
  },
  accordionContent: {
    flexGrow: 0
  }
}))(({
  classes, datasetInfo, stepTitle, setDatasetInfo, setAnnotations,
  annotations, handleNext, handleBack, rawFileName, uploadedFilesData, ...props
}) => {
  // This is the file metadata as we fill in the form (not the one stored in services):
  const [fileMetadata, setFileMetadata] = useState({});

  const back = (event) => {}; // Do nothing

  /**
   * Creates or updates a dataset (indicator) resource in the backend
   **/
  const updateDataset = async (validatedData, { method='post', id }) => {

    const payload = {
      id,
      name: validatedData.name,
      description: validatedData.description,
      domains: validatedData.domains,
      maintainer: {
        name: validatedData['registerer-name'],
        email: validatedData['registerer-email'],
        organization: validatedData['source-organization'],
        website: validatedData['source-website'],
      },
      spatial_resolution: validatedData.spatial_resolution,
      temporal_resolution: validatedData.temporal_resolution,
      data_sensitivity: validatedData.data_sensitivity,
      data_quality: validatedData.data_quality,
    };

    const response = await axios({
      method,
      url: `/api/dojo/indicators${method === 'PATCH' ? '?indicator_id=' + id : ''}`,
      data: payload,
    });
    return response.data;
  };

  const formRef = React.useRef();
  const defaultValues = genRegisterDefaultValues(datasetInfo);
  const [isUpdatingUploadedFile, setUpdatingUploadedFile] = useState(false);

  return (
    <Container
      className={classes.root}
      component="main"
      maxWidth="sm"
    >
      <Typography
        className={classes.header}
        variant="h4"
        align="center"
      >
        {stepTitle}
      </Typography>

      <Formik
        initialValues={defaultValues}
        validationSchema={!skipValidation && formSchema}
        validate={(values) => {

          const bothResolutionsSet = Boolean(values['x-resolution'] && values['y-resolution']);
          const eitherResSet = values['x-resolution'] || values['y-resolution'];

          return !bothResolutionsSet && eitherResSet ?
            {
              'x-resolution': 'You must enter either both or none x/y resolution values',
              'y-resolution': 'You must enter either both or none x/y resolution values'
            } : {};
        }}
        enableReinitialize

        onSubmit={(values, { setSubmitting }) => {

          setSubmitting(true);

          if (values['x-resolution'] && values['y-resolution']) {
            values.spatial_resolution = [
              values['x-resolution'],
              values['y-resolution']
            ];
          }

          const isUpdate = Boolean(datasetInfo?.id);

          async function createAndUploadDataset() {

            const httpMethod = isUpdate ? 'PATCH' : 'POST';
            // TODO try/catch promise error handling
            // Creates or updates a dataset. Update returns no data
            const dataset = await updateDataset(values, {method: httpMethod, id: datasetInfo.id});

            const latestDatasetData = isUpdate ? datasetInfo : dataset;
            const datasetId = latestDatasetData.id;
            const isFileUploaded = datasetInfo.fileData?.raw?.uploaded;

            if (datasetId && (!isFileUploaded || isUpdatingUploadedFile)) {
              const uploadResponse = await uploadFile(formRef.current, datasetId);
              const newRawFileName = uploadResponse.data.filename;
              const fileMetadataData = {...fileMetadata, rawFileName: newRawFileName};
              await updateMetadata(datasetId, fileMetadataData, setAnnotations);

              return { dataset: latestDatasetData, rawFileName: newRawFileName };
            } else {
              return { dataset: latestDatasetData, rawFileName };
            }

          }

          createAndUploadDataset()
            .then(({dataset, rawFileName}) => handleNext({dataset: dataset, filename: rawFileName}));
        }}
      >
        {(formik) => (
          <Form ref={formRef}>

            <Grid
              container
              spacing={4}
            >
              <Grid item xs={12}>
                <BaseData
                  formik={formik}
                  datasetInfo={datasetInfo}
                  setDatasetInfo={setDatasetInfo}
                  fileMetadata={fileMetadata}
                  setFileMetadata={setFileMetadata}
                  isUpdatingUploadedFile={isUpdatingUploadedFile}
                  setUpdatingUploadedFile={setUpdatingUploadedFile}
                  uploadedFilesData={uploadedFilesData}
                />
              </Grid>

              <Grid item xs={12}>
                <ContactInformation />
              </Grid>
            </Grid>

            <Accordion
              square
              variant="outlined"
              className={classes.accordion}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                classes={{ content: classes.accordionContent }}
              >
                <Typography variant="body2">
                  Resolution, Quality, Sensitivity
                </Typography>
              </AccordionSummary>

              <AccordionDetails>
                <Grid
                  container
                  spacing={4}
                >
                  <Grid item xs={12}>
                    <Resolution />
                  </Grid>
                  <Grid item xs={12}>
                    <DataQualitySensitivity />
                  </Grid>
                </Grid>
              </AccordionDetails>

            </Accordion>

            <Navigation
              handleNext={formik.handleSubmit}
              handleBack={back}
            />

          </Form>
        )}
      </Formik>

    </Container>
  );
});
