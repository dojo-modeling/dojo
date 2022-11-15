import React, { useEffect, useState, SetStateAction } from 'react';

import axios from 'axios';
import isEmpty from 'lodash/isEmpty';
import map from 'lodash/map';

import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import { withStyles } from '@material-ui/core/styles';

import AnnotationsSubmitPrompt from './annotations/AnnotationsSubmitPrompt';
import Instructions from './Instructions';
import { Navigation } from '.';
import Progress from './Progress';
import TableAnnotation from './annotations/Table';
import { formatAnnotationsIN } from './annotations/dataIN';
import { formatAnnotationsOUT } from './annotations/dataOUT';
import { validateRequirements } from './annotations/annotationRules';
import Prompt from './PromptDialog';

/**
 * Receives geoclassify data and formats column information for our Data Grid
 * */
function prepareColumns(objData) {
  return Object
    .keys(objData)
    .filter(item => item !== '__id')
    .map((name) => ({ field: name }));
}

/**
 * Container component that will sync tabular row + annotation data with storage/backend.
 * */
export default withStyles(({ spacing }) => ({
  root: {
    padding: [[spacing(6), spacing(4), spacing(2), spacing(4)]],
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: spacing(3),
  },
}))(({
  classes, handleNext, handleBack,
  datasetInfo, stepTitle, rawFileName,
  annotations, setAnnotations, onSubmit,
  addingAnnotationsAllowed=true, useFilepath=false,
  modelInfo,
  fieldsConfig=()=>({})
}) => {
  const [internalAnnotations, setInternalAnnotations] = useState({});
  const [multiPartData, setMultiPartData] = useState({});

  const [isPreviewPromptOpen, setPreviewPromptOpen] = useState(false);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [inferredData, setInferredData] = useState(null);
  const [columnStats, setColumnStats] = useState(null);

  const [isLoading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [promptMessage, setPromptMessage] = useState('');

  useEffect(() => {
    if (!isLoading || (isLoading && !datasetInfo?.id)) {
      return;
    }


    const fileArg = (useFilepath ? "filepath" : "filename");
    const previewUrl = `/api/dojo/indicators/${datasetInfo.id}/preview/raw${rawFileName ? `?${fileArg}=${rawFileName}` : ''}`;

    const getAnnotations = async () => {
      // TODO verify and document this:
      // Model Output condition: We store STATE in memory (no backing indicator created)
      // So we need to ensure we return the data received from props, and not do a new fetch
      if (annotations?.metadata?.geotime_classify) {
        return {data: annotations};
      }
      else {
        // Load annotations from API, which also include other data unavailable if we don't call this
        return axios.get(`/api/dojo/indicators/${datasetInfo.id}/annotations`);
      }
    };

    Promise
      .all([
        getAnnotations(),
        axios.post(previewUrl)
      ])
      .then(([serverAnnotationData, preview]) => {
        const { metadata } = serverAnnotationData.data;

        const inferred = metadata.geotime_classify;
        const stats = {histograms: metadata.histograms, statistics: metadata.column_statistics};

        const parsedColumns = prepareColumns(preview.data[0]);
        const { annotations: serverAnnotations } = serverAnnotationData.data;

        setRows(preview.data);
        setColumns(parsedColumns);
        setInferredData(inferred);
        setColumnStats(stats);

        if (serverAnnotations) {
          const formattedIn = formatAnnotationsIN(serverAnnotations);
          setInternalAnnotations(formattedIn.annotations);
          setMultiPartData(formattedIn.multiPartData);
        }
      })
      .catch((e) => {
        setPromptMessage('Error loading annotation data.');
        console.error('Error fetching geoclassify or raw preview:', e);
      })
      .finally(() => { setLoading(false); });
  }, [datasetInfo, isLoading]);

  function submitToBackend() {
    setSubmitLoading(true);

    const formattedAnnotations = formatAnnotationsOUT(internalAnnotations);
    const backendPayload = { annotations: formattedAnnotations };

    axios
      .patch(`/api/dojo/indicators/${datasetInfo.id}/annotations`, backendPayload)
      .then(handleNext)
      .catch(() => {
        setPromptMessage('Error submitting annotation data.');
      })
      .finally(() => { setSubmitLoading(false); });
  }

  function next() {
    // TODO use errors || warnings as condition to open prompt instead of additional open state
    // clear last viewed warnings||errors in order to close
    const { errors: newErrors, warnings: newWarnings } = validateRequirements(internalAnnotations);
    setWarnings(newWarnings);
    setErrors(newErrors);

    if (!isEmpty(newErrors) || !isEmpty(newWarnings)) {
      setPreviewPromptOpen(true);
    } else {
      if (onSubmit) {
        const formattedAnnotations = formatAnnotationsOUT(internalAnnotations);
        onSubmit({annotations, formattedAnnotations, setAnnotations, handleNext});

      } else {
        submitToBackend();
      }
    }
  }

  /**
   * Selects all values for the given columnName, from the rows data previously fetched.
   * We'll build an array of cell values, and send it to the backend alongside a
   * python format string in order to validate.
   * As it stands right now, the frontend only receives 100 data points, so that's
   * the amount of data we'll parse/send.
   * */
  async function validateDateFormat(columnName, pythonFormatString) {
    const payload = {
      values: map(rows, columnName),
      format: pythonFormatString
    };

    try {
      const response = await axios.post('/api/dojo/indicators/validate_date', payload);
      return response.data?.valid ? '' : 'Incompatible format';
    } catch (e) {
      // TODO Better error handling
      console.log('Server error while validating date format.', e);
      return '';
    }
  }

  return (
    <Container
      className={classes.root}
      component="main"
      maxWidth="xl"
    >
      <Typography
        className={classes.header}
        variant="h4"
        align="center"
      >
        {stepTitle}
        <Instructions />
      </Typography>

      <TableAnnotation
        loading={isLoading}
        columns={columns}
        rows={rows}
        annotateColumns={setInternalAnnotations}
        annotations={internalAnnotations}
        inferredData={inferredData}
        multiPartData={multiPartData}
        setMultiPartData={setMultiPartData}
        columnStats={columnStats}
        validateDateFormat={validateDateFormat}
        fieldsConfig={fieldsConfig}
        addingAnnotationsAllowed={addingAnnotationsAllowed}
      />

      <Navigation
        disabled={submitLoading}
        handleNext={next}
        handleBack={handleBack}
      />

      <AnnotationsSubmitPrompt
        open={isPreviewPromptOpen}
        errors={errors}
        warnings={warnings}
        onDecline={() => setPreviewPromptOpen(false)}
        onAccept={() => {if (onSubmit) {onSubmit({annotations, setAnnotations, handleNext})} else {submitToBackend()};}}
      />

      <Prompt
        open={Boolean(promptMessage)}
        title="An error has occured"
        message={promptMessage}
        handleClose={() => setPromptMessage('')}
      />

    </Container>
  );
});
