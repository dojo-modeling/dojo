import React, { useEffect } from 'react';

import * as yup from 'yup';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';

import { FormikProvider, useFormik } from 'formik';

import FormikTextField from './FormikTextField';

const useStyles = makeStyles((theme) => ({
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
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
    .min(30, 'Description should be at least 30 characters')
    .required('Description is required'),
  maintainer: yup.object().shape({
    website: yup
      .string('Enter your repository URL')
      .url('Model website must be a valid URL')
      .required('Model website is required'),
  }),
});

export const ModelOverviewFields = ({
  formik, lockFamilyName
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
      disabled={lockFamilyName}
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
  modelInfo, handleNext, lockFamilyName, resetFirstForm, setResetFirstForm
}) => {
  const classes = useStyles();
  const formik = useFormik({
    initialValues: modelInfo,
    validationSchema: overviewValidationSchema,
    onSubmit: (values) => {
      handleNext(values);
    },
    // we need this to allow the family name to come through after the modelInfo prop updates
    enableReinitialize: true,
  });

  useEffect(() => {
    // saving the form state every 1 second is probably sufficient
    const debounced = setTimeout(() => {
      localStorage.setItem('modelStep', 0);
      localStorage.setItem('modelInfo', JSON.stringify(formik.values));
    }, 1000);
    // clear the previous timeout if more changes are made, meaning we wait another 1s
    return () => clearTimeout(debounced);
  }, [formik]);

  useEffect(() => {
    // when the parent stepper tells this form to reset
    if (resetFirstForm) {
      // but make sure we tell the parent we've done it, and cancel future resets
      setResetFirstForm(false);

      formik.resetForm();
    }
  }, [resetFirstForm, setResetFirstForm, formik]);

  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit}>
        <ModelOverviewFields formik={formik} lockFamilyName={lockFamilyName} />
        <div className={classes.buttonContainer}>
          <Button disabled>
            Back
          </Button>
          <Button
            color="primary"
            data-test="modelFormOverviewNextBtn"
            type="submit"
            variant="contained"
            disableElevation
          >
            Next
          </Button>
        </div>
      </form>
    </FormikProvider>
  );
};
