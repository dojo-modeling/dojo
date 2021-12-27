import React, { useCallback, useState } from 'react';

import { FormikProvider, useFormik } from 'formik';

import Container from '@material-ui/core/Container';
import { makeStyles } from '@material-ui/core/styles';

import FullScreenDialog from './FullScreenDialog';
import ModelRegionForm from './ModelRegionForm';
import { useModel } from './SWRHooks';
import { ModelDetailFields, detailValidationSchema } from './ModelDetailForm';
import { ModelOverviewFields, overviewValidationSchema } from './ModelOverviewForm';

const useStyles = makeStyles((theme) => ({
  root: {
    margin: [[theme.spacing(1), 'auto', theme.spacing(4)]],
  },
}));

// format what we get back from the server to work with the form
const formatModel = (model) => {
  const {
    period,
    ...parsedModel
  } = model;

  // turn these from epoch time into Date objects
  parsedModel.period = { gte: new Date(model.period.gte), lte: new Date(model.period.lte) };

  parsedModel.storedRegions = [];

  // our region picker needs the regions in a specific format
  Object.keys(model.geography).forEach((level) => {
    if (level === 'country' || level === 'admin1' || level === 'admin2' || level === 'admin3') {
      model.geography[level]?.forEach(
        // unfortunately we don't store the country in the db, so we have no country here
        (region) => parsedModel.storedRegions.push({ value: region, level, country: null })
      );
    }
  });

  return parsedModel;
};

export const ModelSummaryEditor = ({
  model, open, setOpen
}) => {
  const { mutateModel } = useModel(model.id);
  const [parsedModel, setParsedModel] = useState(formatModel(model));

  const classes = useStyles();

  const handleSubmit = async (modelInfo) => {
    // pull out the regions formatted for display ('geography' holds the values the backend wants)
    // and the Date object version of period
    const {
      selectedRegions,
      storedCoords,
      period,
      geography,
      ...parsedModelInfo
    } = modelInfo;

    // add back in period with the epoch values
    parsedModelInfo.period = {
      gte: modelInfo.period.gte?.valueOf(),
      lte: modelInfo.period.lte?.valueOf(),
    };
    // add in the geography from the separate parsedModel state
    // as ModelRegionForm isn't part of our single Formik form
    parsedModelInfo.geography = parsedModel.geography;

    const settings = {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsedModelInfo)
    };

    try {
      const resp = await fetch(`/api/dojo/models/${parsedModelInfo.id}`, settings);
      if (resp.ok) {
        // tell SWR to update the model
        mutateModel();
        // close the FullScreenDialog
        setOpen(false);
        // TODO: add a success toast
        console.log('success! model updated');
      }
    } catch (e) {
      console.log('error!...');
      console.log(e);
    }
  };

  const formik = useFormik({
    initialValues: parsedModel,
    // combine the overview and detail validation schemas
    validationSchema: overviewValidationSchema.concat(detailValidationSchema),
    onSubmit: (values) => handleSubmit(values),
  });

  const updateModel = useCallback((values) => {
    // this is just used to keep track of the geography attribute
    // which we'll merge back into the formik form results in handleSubmit
    setParsedModel((prevValues) => ({ ...prevValues, ...values }));
  }, []);

  return (
    <FullScreenDialog
      open={open}
      setOpen={setOpen}
      /* Wrap formik.submitForm in curly braces so we don't return a truthy value
          and cause the FullScreenDialog to close */
      onSave={() => { formik.submitForm(); }}
    >
      <Container maxWidth="md" className={classes.root}>
        {/* Without a FormikProvider, the formik Field components
            in ModelDetailFields will break */}
        <FormikProvider value={formik}>
          <form onSubmit={formik.handleSubmit}>
            <ModelOverviewFields formik={formik} />
            <ModelDetailFields formik={formik} />
          </form>
        </FormikProvider>
        {/* ModelRegionForm isn't part of the Formik form above, so it lives down here
            otherwise there are forms nested within forms, which is no good */}
        <ModelRegionForm
          handleNext={updateModel}
          storedRegions={parsedModel.storedRegions}
          storedCoords={parsedModel.geography.coordinates}
          autoSave
        />
      </Container>
    </FullScreenDialog>
  );
};
