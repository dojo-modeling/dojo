import React from 'react';

import * as yup from 'yup';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

import { FormikProvider, useFormik } from 'formik';

import FormikTextField from './FormikTextField';

const useStyles = makeStyles((theme) => ({
  buttonContainer: {
    marginTop: theme.spacing(2),
    '& :first-child': {
      marginRight: theme.spacing(1),
    },
  },
}));

export const overviewValidationSchema = yup.object({
  name: yup
    .string('Enter your model name')
    .required('Model name is required'),
  family_name: yup
    .string('Enter the model family name')
    .required('Model family is required'),
  description: yup
    .string('Enter a model description')
    .min(8, 'Description should be at least 250 characters')
    .required('Description is required'),
  maintainer: yup.object().shape({
    website: yup
      .string('Enter your repository URL')
      .url('Model website must be a valid URL')
      .required('Model website is required'),
  }),
});

export const ModelOverviewFields = ({
  formik
}) => (
  <>
    <FormikTextField
      autoFocus
      name="name"
      label="Model Name"
      formik={formik}
    />
    <FormikTextField
      name="maintainer.website"
      label="Model Website"
      formik={formik}
    />
    <FormikTextField
      name="family_name"
      label="Model Family"
      formik={formik}
    />
    <FormikTextField
      name="description"
      label="Model Description"
      formik={formik}
      type="description"
      multiline
      rows={4}
      variant="outlined"
    />
  </>
);

export const ModelOverview = ({
  modelInfo, handleNext
}) => {
  const classes = useStyles();
  const formik = useFormik({
    initialValues: modelInfo,
    validationSchema: overviewValidationSchema,
    onSubmit: (values) => {
      handleNext(values);
    },
  });

  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit}>
        <div className={classes.buttonContainer}>
          <ModelOverviewFields formik={formik} />
          <Button disabled>
            Back
          </Button>
          <Button
            color="primary"
            data-test="modelFormOverviewNextBtn"
            type="submit"
            variant="contained"
          >
            Next
          </Button>
        </div>
      </form>
    </FormikProvider>
  );
};
