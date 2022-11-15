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
 * Dataset Append file landing page (fileMetadata, file upload).
 **/

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
  classes, datasetInfo, error, stepTitle, setDatasetInfo,
  annotations, setAnnotations, handleNext, handleBack,
  rawFileName, uploadedFilesData,
  ...props
}) => {
  const history = useHistory();
  const [file, setFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState({});

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

          setSubmitting(true);

          const isFileUploaded = datasetInfo.fileData?.raw?.uploaded;
          let rawFileNameToUse = rawFileName;

          if (!isFileUploaded || isUpdatingUploadedFile) {
            const uploadResponse = await uploadFile(formRef.current, datasetInfo.id, {append: true, filename: rawFileName});

            rawFileNameToUse = uploadResponse.data.filename;

            const fileMetadataData = {...fileMetadata, rawFileName: rawFileNameToUse};

            await updateMetadata(datasetInfo.id, fileMetadataData, setAnnotations);

          }

          handleNext({dataset: datasetInfo, filename: rawFileNameToUse});
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
                  error={error}
                  isUpdatingUploadedFile={isUpdatingUploadedFile}
                  setUpdatingUploadedFile={setUpdatingUploadedFile}
                  uploadedFilesData={uploadedFilesData}
                  isReadOnlyMode
                />
              </Grid>

              <Grid item xs={12}>
                <ContactInformation isReadOnlyMode />
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
                    <Resolution isReadOnlyMode />
                  </Grid>
                  <Grid item xs={12}>
                    <DataQualitySensitivity isReadOnlyMode />
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
