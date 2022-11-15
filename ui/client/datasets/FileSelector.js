import React, { useState } from 'react';
import { useField } from 'formik';
import * as XLSX from 'xlsx/xlsx.mjs';
import * as GeoTiff from 'geotiff';
import { withStyles } from '@material-ui/core/styles';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Button from '@material-ui/core/Button';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import TextField from '@material-ui/core/TextField';
import { Tooltip, Typography } from '@material-ui/core';
import get from 'lodash/get';
import isFunction from 'lodash/isFunction';

import { matchFileNameExtension } from '../utils';


const NullGeotiffTooltip = ({...props}) => <Tooltip
  title={
    <Typography variant='caption'>
      Numeric value that when used indicates missing or null values.<br/>
      Geotiff values are always an integer or float.
    </Typography>
  }
  {...props}
/>


export const ExtraInput = ({
  formik, fileMetadata, setFileMetadata, ...props
}) => {

  // TODO This metadata is set on user file select etc, not on loading a previously
  // uploaded file. We'll check if we can populate
  // and display these prepopulated instead....
  // console.log('FileSelector.js - ExtraInput - fileMetadata:', fileMetadata);

  if (!fileMetadata.filetype) {
    return null;
  }

  const setBand = (evt, band_num) => {
    const { value } = evt.target;
    const geotiff_bands = { ...(fileMetadata.geotiff_bands) };
    if (value === '') {
      if (geotiff_bands.hasOwnProperty(band_num)) {
        delete geotiff_bands[band_num];
      } else {
        return;
      }
    } else {
      geotiff_bands[band_num] = value;
    }
    setFileMetadata({ ...fileMetadata, geotiff_bands });
  };

  if (fileMetadata.filetype === 'excel') {
    const label = 'Sheet selection';
    const name = 'excel_sheet';

    return (
      <Autocomplete
        name={name}
        value={fileMetadata.excel_sheet}
        autoHighlight
        options={fileMetadata.excel_sheets}
        onChange={(evt, value) => {
          if (value) {
            setFileMetadata({ ...fileMetadata, excel_sheet: value });
          }
        }}
        onBeforeInput={(evt) => {
          if (evt.nativeEvent?.type === 'keypress' && evt.nativeEvent.keyCode === 13) {
            evt.preventDefault();
            evt.stopPropagation();
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label={label}
          />
        )}
      />
    );
  }
  if (fileMetadata.filetype === 'geotiff') {
    const name = 'geotiff_info';
    if (fileMetadata.geotiff_band_count > 1) {
      return (
        <>
          <div style={{
            marginBottom: '1em',
            marginTop: '1em',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            alignItems: 'center',
          }}
          >
            <Typography
              display="inline"
            >
              The dimensions of my geotiff bands repesent:
            </Typography>
            <Select
              name="band_type"
              variant="outlined"
              margin="dense"
              value={fileMetadata.geotiff_band_type}
              onChange={(evt) => {
                const { value } = evt.target;
                setFileMetadata({ ...fileMetadata, geotiff_band_type: value, geotiff_bands: {} });
              }}
            >
              <MenuItem value="category">category</MenuItem>
              <MenuItem value="temporal">temporal</MenuItem>
            </Select>
          </div>

          {fileMetadata.geotiff_band_type === 'category' && (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '0.5em', rowGap: '0.5em',
            }}
            >
              <TextField
                name="geotiff_value"
                variant="outlined"
                label="Enter dataset date"
                helperText="YYYY-MM-DD"
                onChange={(evt) => {
                  const { value } = evt.target;
                  setFileMetadata({ ...fileMetadata, geotiff_value: value });
                }}
              />
              <NullGeotiffTooltip>
                <TextField
                  name="geotiff_Null_Val"
                  variant="outlined"
                  label="Geotiff Null Value"
                  onChange={(evt) => {
                    const { value } = evt.target;
                    setFileMetadata({ ...fileMetadata, geotiff_null_value: value });
                  }}
                />
              </NullGeotiffTooltip>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '0.5em', rowGap: '0.5em',
            }}
            >
              {/* This generates a numbered TextField input for each band in the geotiff to allow labeling */}
              {Array.from(Array(fileMetadata.geotiff_band_count).keys()).map((i) => {
                const band_num = i + 1;
                return (
                  <TextField
                    key={`band_${band_num}`}
                    name="bands"
                    variant="outlined"
                    label={`Band ${band_num} Name`}
                    onChange={(evt) => setBand(evt, band_num)}
                  />
                );
              })}
            </div>
          </>
          )}
          {fileMetadata.geotiff_band_type === 'temporal' && (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '0.5em', rowGap: '0.5em', marginBottom: '1.1em'
            }}
            >
              <TextField
                name="geotiff_feature_name"
                variant="outlined"
                label="Enter feature name"
                onChange={(evt) => {
                  const { value } = evt.target;
                  setFileMetadata({ ...fileMetadata, geotiff_value: value });
                }}
              />
              <NullGeotiffTooltip>
                <TextField
                  name="geotiff_Null_Val"
                  variant="outlined"
                  label="Geotiff Null Value"
                  onChange={(evt) => {
                    const { value } = evt.target;
                    setFileMetadata({ ...fileMetadata, geotiff_null_value: value });
                  }}
                />
              </NullGeotiffTooltip>
            </div>

            <div>
              <Typography variant="caption">Suggested format: YYYY-MM-DD</Typography>
            </div>
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '0.5em', rowGap: '0.5em'
              }}
            >
              {/* This generates a numbered TextField input for each band in the geotiff to allow labeling */}
              {Array.from(Array(fileMetadata.geotiff_band_count).keys()).map((i) => {
                const band_num = i + 1;
                return (
                  <TextField
                    key={`band_${band_num}`}
                    bandnum={band_num}
                    name="bands"
                    variant="outlined"
                    label={`Band ${band_num} Date`}
                    onChange={(evt) => setBand(evt, band_num)}
                  />
                );
              })}
            </div>
          </>
          )}
        </>
      );
    }
    if (fileMetadata.geotiff_band_count === 1) {
      return (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '0.5em', rowGap: '0.5em', marginBottom: '1.1em'
        }}
        >
          <TextField
            name="geotiff_Feature_Name"
            variant="outlined"
            label="Geotiff Feature Name"
            onChange={(evt) => {
              const { value } = evt.target;
              setFileMetadata({ ...fileMetadata, geotiff_value: value });
            }}
          />
          <NullGeotiffTooltip>
            <TextField
              name="geotiff_Null_Val"
              variant="outlined"
              label="Geotiff Null Value"
              helperText=""
              onChange={(evt) => {
                const { value } = evt.target;
                setFileMetadata({ ...fileMetadata, geotiff_null_value: value });
              }}
            />
          </NullGeotiffTooltip>
          <TextField
            name="geotiff_date_value"
            variant="outlined"
            label="Enter dataset date"
            helperText="YYYY-MM-DD"
            onChange={(evt) => {
              const { value } = evt.target;
              setFileMetadata({ ...fileMetadata, geotiff_date_value: value });
            }}
          />
        </div>
      );
    }

    return <div>File can't be read correctly!!</div>;
  }
  return null;
};

/**
 *
 * */
const FileInput = withStyles(({ spacing }) => ({
  root: {
    margin: [[spacing(1), 0]],
    '& .MuiFormHelperText-root': {
      marginLeft: 7,
      marginRight: 5,
    }
  }
}))(({
  formik, datasetInfo, setDatasetInfo, fileMetadata, setFileMetadata,
  name, label, onFileSelect, InputProps={}, required, requiredFn,
  classes, inputProps={}, ...props
}) => {
  const [{ onChange, value, ...field }, meta, setters] = useField({ ...props, name });

  function handleChange(event) {
    // Set value in form context
    onChange(event);

    // handle further logic from caller
    if (onFileSelect) {
      onFileSelect(event);
    }
  }

  return (
    <TextField
      className={classes.root}
      label={label}
      variant="outlined"
      fullWidth
      InputLabelProps={{ shrink: true }}
      InputProps={{
        type: 'file',
        style: { borderRadius: 0 },
        ...InputProps
      }}
      inputProps={{
        'data-testid': 'file-upload-input',
        'aria-label': label,
        ...inputProps
      }}
      {...field}
      helperText={get(meta, 'touched') && get(meta, 'error')}
      error={get(meta, 'error') && get(meta, 'touched')}
      required={required || (isFunction(requiredFn) ? requiredFn(name) : false)}
      onChange={handleChange}
      {...props}
    />
  );
});

/**
 *
 * */
export const FileSelector = withStyles(({ spacing, palette }) => ({
  warning: {
    backgroundColor: 'pink'
  },
  uploadedFileData: {
    padding: [[spacing(1), spacing(0)]],
    '& .filename': {
      fontWeight: 'bold'
    },
    '& button': {
      marginTop: spacing(0.5)
    }
  }
}))((allProps) => {

  const {
    formik, classes,
    fileMetadata, setFileMetadata,
    isUpdatingUploadedFile, setUpdatingUploadedFile,
    displayUploadedFile,
    uploadedFilesData,
    ...props
  } = allProps;

  const [message, setMessage] = useState(null);
  const [processing, setProcessing] = useState(false);

  const analyzeExcel = (file, metadata) => {
    setMessage(null);
    const reader = new FileReader();

    reader.onload = () => {
      const xlsxFile = XLSX.read(reader.result);
      const excel_sheets = xlsxFile.SheetNames;
      setFileMetadata({
        ...metadata,
        filetype: 'excel',
        excel_sheets,
        excel_sheet: excel_sheets[0],
      });
    };

    reader.readAsArrayBuffer(file);
  };

  const analyzeGeotiff = (file, metadata) => {
    const reader = new FileReader();

    reader.onload = () => {
      GeoTiff.fromArrayBuffer(reader.result).then((geotiffFile) => {
        geotiffFile.getImage().then((image) => {
          const band_count = image.getSamplesPerPixel();
          setFileMetadata({
            ...metadata,
            filetype: 'geotiff',
            geotiff_band_count: band_count,
            ...(
              (band_count > 1)
                ? {
                  geotiff_band_type: 'category',
                  geotiff_bands: {},
                } : {}
            )
          });
        });
      });
    };

    reader.readAsArrayBuffer(file);
  };

  const extensionHandlers = {
    '.tif': [analyzeGeotiff, 'geotiff'],
    '.tiff': [analyzeGeotiff, 'geotiff'],
    '.xlsx': [analyzeExcel, 'excel'],
    '.xls': [analyzeExcel, 'excel'],
    '.csv': [null, 'csv'],
    '.nc': [null, 'netcdf'],
    '.cdf': [null, 'netcdf'],
  };

  const analyzeFile = (evt) => {
    setProcessing(true);
    setMessage(null);
    const fileInput = evt.target;
    const file = fileInput.files[0];
    const filename = file.name.toLowerCase();
    const fileExtensionMatch = matchFileNameExtension(filename);

    if (fileExtensionMatch) {
      const [extensionHandler, filetypeValue] = extensionHandlers[fileExtensionMatch];
      const rawFileName = `raw_data${fileExtensionMatch}`;

      // Important- filename and rawFileName set on metadata here
      const metadata = { filetype: filetypeValue, filename, rawFileName };

      return extensionHandler ?
        extensionHandler(file, metadata) :
        setFileMetadata({ ...fileMetadata, ...metadata });
    }

    setMessage(`File ${file.name} is not a type that Dojo is able to process.`);
    setProcessing(false);
    setFileMetadata({});

    return null;
  };

  const currentFileName = formik?.values?.file;

  // Previous uploaded file exists, but user is uploading a new one (edit mode)
  //    AND we have selected a new file (currentFileName)
  const newFileSelected = isUpdatingUploadedFile && currentFileName;
  const uploadedRawFileNameToUse = get(props?.datasetInfo, 'fileData.raw.rawFileName');
  const uploadedFileName = get(props?.datasetInfo, 'fileData.raw.url');
  const uploadedFileMetadata = get(uploadedFilesData, uploadedRawFileNameToUse, null);

  const fileMetadataKeys = uploadedFileMetadata ?
        Object
        .keys(uploadedFileMetadata)
        .filter(k => !['filename', 'excel_sheets', 'rawFileName', 'filetype'].includes(k)) : [];

  return (
    <div>
      {displayUploadedFile && !isUpdatingUploadedFile ? (
        <div className={classes.uploadedFileData}>
          <Typography>
            Uploaded filename: <span className="filename">
                                 {uploadedFileName}
                               </span>
          </Typography>

          <table>
            <tbody>
            {fileMetadataKeys.map(key => (
              <tr key={key}>
                <td>
                  {key}
                </td>
                <td>
                  {uploadedFileMetadata[key]}
                </td>
              </tr>
            ))}
            </tbody>
          </table>

          {setUpdatingUploadedFile && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setUpdatingUploadedFile(true)}
            >
              Replace File

            </Button>
          )}
        </div>
      ) : (
        <>
        <FileInput
          onFileSelect={analyzeFile}
          {...props}
        />
          {displayUploadedFile && (
            <div className={classes.uploadedFileData}>
              <Typography>You're replacing a previously uploaded file.</Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setUpdatingUploadedFile(false)}
              >
                Cancel and use original
              </Button>
            </div>
          )}
        </>
      )}
      {message && (
        <div className={message ? classes.warning : ''}>
          {message}
        </div>
      )}
      <ExtraInput
        formik={formik}
        fileMetadata={fileMetadata}
        setFileMetadata={setFileMetadata}
      />
    </div>
  );
});
