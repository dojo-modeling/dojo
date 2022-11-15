import React, { useState, useEffect } from 'react';
import { Form, Formik } from 'formik';
import axios from 'axios';

import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Container from '@material-ui/core/Container';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Grid from '@material-ui/core/Grid';
import { useHistory } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

import get from 'lodash/get';
import isEmpty from 'lodash/isEmpty';

import { Navigation } from '.';
import {
  uploadFile,
  updateMetadata, genRegisterDefaultValues,
  formSchema, BaseData, ContactInformation,
  Resolution, DataQualitySensitivity
} from './metadataComponents';

const skipValidation = false;


/**
 * Dataset Update Metadata file landing page (fileMetadata changes only).
 **/
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
  classes, datasetInfo, error, stepTitle, setDatasetInfo,
  annotations, setAnnotations, handleNext, handleBack,
  rawFileName, uploadedFilesData,
  ...props
}) => {
  const history = useHistory();
  const [file, setFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState({});

  const updateDataset = async (validatedData, id) => {

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
      data_quality: validatedData.data_quality
    };

    const response = await axios({
      method: 'PATCH',
      url: `/api/dojo/indicators?indicator_id=${id}`,
      data: payload,
    });
    return response.data;
  };

  const formRef = React.useRef();

  const back = (event) => {}; // Do nothing

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
        enableReinitialize
        onSubmit={ async (values, { setSubmitting }) => {
          const datasetId = datasetInfo?.id;
          if (!datasetId) {
            throw(new Error('Unable to update metadata for an invalid Dataset.'));
          }

          setSubmitting(true);

          updateDataset(values, datasetId)
            .then(() => {
              handleNext({dataset: datasetInfo, filename: rawFileName});
            });
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
                  fileMetadata={fileMetadata}
                  setDatasetInfo={setDatasetInfo}
                  error={error}
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
              disabled={Boolean(error)}
            />

          </Form>
        )}
      </Formik>

    </Container>
  );
});
