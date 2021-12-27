import React from 'react';

import 'leaflet/dist/leaflet.css';
import {
  LayerGroup,
  MapContainer,
  Rectangle,
  TileLayer,
} from 'react-leaflet';

import * as yup from 'yup';

import { FormikProvider, useFormik } from 'formik';

import { makeStyles } from '@material-ui/core/styles';
import {
  Box,
  Button,
  Typography,
} from '@material-ui/core';

import FormikTextField from './FormikTextField';

const useStyles = makeStyles((theme) => ({
  chip: {
    margin: theme.spacing(0.5),
  },
  chipContainer: {
    backgroundColor: theme.palette.grey[50],
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    listStyle: 'none',
    padding: theme.spacing(0.5),
    margin: 0,
    minHeight: theme.spacing(11),
  },
  coordsInputs: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: [[0, theme.spacing(1)]],
    '& :first-child': {
      marginRight: theme.spacing(1),
    },
  },
  coordsWrapper: {
    width: '100%',
  },
  explainer: {
    margin: [[theme.spacing(2), 0]]
  },
  regionButton: {
    height: theme.spacing(5),
    minWidth: theme.spacing(24),
    margin: [[theme.spacing(5), theme.spacing(1), theme.spacing(1)]],
  },
}));

const validationSchema = yup.object({
  Lat1: yup.number('Latitude must be a number').required(),
  Lng1: yup.number('Longitude must be a number').required(),
  Lat2: yup.number('Latitude must be a number').required(),
  Lng2: yup.number('Longitude must be a number').required(),
});

function ModelRegionMap({ mapCoords, updateMapCoords, showMap }) {
  const classes = useStyles();
  let handleAddRegion;

  const formik = useFormik({
    initialValues: {
      Lat1: '', Lng1: '', Lat2: '', Lng2: ''
    },
    validationSchema,
    onSubmit: (values) => handleAddRegion(values),
  });

  handleAddRegion = (values) => {
    // build the bounding box from the inputs
    const coords = [[values.Lat1, values.Lng1], [values.Lat2, values.Lng2]];
    updateMapCoords((prev) => [...prev, coords]);
    formik.resetForm();
  };

  return (
    <div>
      { showMap && (
        <>
          <Typography
            variant="subtitle1"
            align="center"
            className={classes.explainer}
          >
            Add regions as rectangular bounding boxes
            <br />
            Enter opposing corners into the Corner 1 and Corner 2 sections
          </Typography>
          <FormikProvider value={formik} validateOnBlur>
            <form onSubmit={formik.handleSubmit}>
              <Box display="flex" justifyContent="space-around">
                <div className={classes.coordsWrapper}>
                  <Typography align="center">Corner 1</Typography>
                  <div className={classes.coordsInputs}>
                    <FormikTextField
                      formik={formik}
                      label="Lat"
                      name="Lat1"
                      variant="outlined"
                    />
                    <FormikTextField
                      label="Lng"
                      name="Lng1"
                      variant="outlined"
                      formik={formik}
                    />
                  </div>
                </div>
                <div className={classes.coordsWrapper}>
                  <Typography align="center">Corner 2</Typography>
                  <div className={classes.coordsInputs}>
                    <FormikTextField
                      label="Lat"
                      name="Lat2"
                      variant="outlined"
                      formik={formik}
                    />
                    <FormikTextField
                      label="Lng"
                      name="Lng2"
                      variant="outlined"
                      formik={formik}
                    />
                  </div>
                </div>

                <Button
                  className={classes.regionButton}
                  color="secondary"
                  data-test="modelFormCoordsBtn"
                  disableElevation
                  type="submit"
                  variant="contained"
                >
                  Add region to map
                </Button>
              </Box>
            </form>
          </FormikProvider>

          <MapContainer
            center={[51.505, -0.09]}
            zoom={1}
            scrollWheelZoom={false}
            style={{ height: 340, margin: '0 auto' }}
          >
            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!!mapCoords.length && (
              <LayerGroup>
                {/* rect: [[Lat1, Lng1], [Lat2, Lng2]] */}
                {mapCoords.map((rect) => (
                  <Rectangle key={rect} bounds={rect} />
                ))}
              </LayerGroup>
            )}
          </MapContainer>
        </>
      )}
    </div>
  );
}

export default ModelRegionMap;
