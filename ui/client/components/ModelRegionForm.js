import React, { useEffect, useRef, useState } from 'react';

import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Autocomplete from '@material-ui/lab/Autocomplete';
import CloseIcon from '@material-ui/icons/Close';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import { makeStyles } from '@material-ui/core/styles';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@material-ui/core';

import Fuse from 'fuse.js';

import CountriesAndRegions from '../assets/nestedCountries.json';

import ModelRegionMap from './ModelRegionMap';

const useStyles = makeStyles((theme) => ({
  buttonContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(1),
    '& :first-child': {
      marginRight: theme.spacing(1),
    },
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  chipsContainerParent: {
    backgroundColor: theme.palette.grey[50],
    padding: theme.spacing(0.5),
    minHeight: theme.spacing(11),
    margin: 0,
  },
  chipsContainer: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    listStyle: 'none',
  },
  explainer: {
    margin: [[theme.spacing(1), 0]]
  },
  input: {
    width: theme.spacing(38),
  },
  line: {
    height: '1px',
    backgroundColor: theme.palette.grey[500],
    flex: '1',
    margin: [[0, theme.spacing(1)]],
  },
  regionButton: {
    width: theme.spacing(19),
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'center',
    '& > :first-child': {
      marginRight: theme.spacing(1),
    },
  },
}));

const parseRegions = (selectedRegions, mapCoords) => {
  const regions = {};
  selectedRegions.forEach((region) => {
    if (!regions[region.level]) {
      regions[region.level] = [];
    }
    regions[region.level].push(region.value);
  });
  // add in the coordinates from the ModelRegionMap component
  regions.coordinates = mapCoords;
  return { geography: regions };
};

function ModelRegionForm({
  handleBack, handleNext, storedRegions, storedCoords, autoSave
}) {
  const classes = useStyles();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [autocompleteValue, setAutocompleteValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedRegions, setSelectedRegions] = useState(storedRegions);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');
  const [mapCoords, setMapCoords] = useState(storedCoords);
  const [showMap, setShowMap] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const initialLoad = useRef(true);

  const search = (query) => {
    const options = {
      keys: ['country', 'admin1', 'admin2', 'admin3'],
      threshold: 0.1,
      includeMatches: true,
      ignoreLocation: true,
    };

    const fuse = new Fuse(CountriesAndRegions, options);
    const result = fuse.search(query);

    if (!result.length) {
      // separate state for this to keep the snackbar text static
      setSnackbarText(searchQuery);
      // open the snackbar if we have no results
      setShowSnackbar(true);
    } else {
      // close it in case it is still open
      setShowSnackbar(false);
    }

    return result;
  };

  useEffect(() => {
    // only do this if we're in the ModelSummaryEditor, where we have no submit button
    if (autoSave) {
      // pass in the parsed regions to our handleNext prop function
      handleNext(parseRegions(selectedRegions, mapCoords));
    }
    // anytime selectedRegions or mapCoords changes
  }, [selectedRegions, mapCoords, autoSave, handleNext]);

  const onBack = () => {
    const regions = parseRegions(selectedRegions, mapCoords);
    // store regions parsed as the DB wants them (ie organized into admin levels)
    // then store selected regions to line up with our local list of regions so we can repopulate
    // the 'selected regions' box without duplicates
    // and store mapCoords so we can repopulate the box and the map
    handleBack({ ...regions, selectedRegions, storedCoords: mapCoords });
  };

  // This is where we interact with localStorage - to save state & if there is saved state
  // though saved state will usually be passed in by the parent ModelFormStepper
  useEffect(() => {
    // don't do this when we first load the component
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    // parse the entered form data to fit what the parent wants
    const regions = parseRegions(selectedRegions, mapCoords);

    // fetch from localstorage in case we missed something
    const storedModel = localStorage.getItem('modelInfo');
    const parsedModel = JSON.parse(storedModel);
    // combine everything into one object
    const combinedModel = {
      ...parsedModel, regions, selectedRegions, storedCoords: mapCoords
    };

    // no need to debounce this, as it takes a lot of clicks before these get updated
    // and pass it back to localStorage so that we can get it again in the future
    localStorage.setItem('modelStep', 2);
    localStorage.setItem('modelInfo', JSON.stringify(combinedModel));
  }, [mapCoords, selectedRegions]);

  const clearAutocomplete = () => {
    setSearchQuery('');
    setSearchResults([]);
    setAutocompleteValue('');
    setInputValue('');
  };

  const onRegionSubmit = () => {
    if (!autocompleteValue) return;

    setSelectedRegions((regions) => [...regions, autocompleteValue]);

    clearAutocomplete();
  };

  const getAutocompleteOptions = () => {
    const options = [];
    searchResults.forEach((country) => {
      country.matches.forEach((match) => {
        const result = {};
        result.value = match.value;
        result.level = match.key;
        result.country = country.item.country;
        options.push(result);
      });
    });

    return options;
  };

  const formatRegionLabel = (region) => (
    // only include country if we have it - we won't get the country back from the server
    // if a user is viewing this in the summary step
    // eslint-disable-next-line prefer-template
    `${region.value}, ${region.level}` + (region.country ? ` (${region.country})` : '')
  );

  const checkRegionEquality = (region1, region2) => (
    region1.value === region2.value
      && region1.country === region2.country
      && region1.level === region2.level
  );

  const handleChipDelete = (regionToDelete) => {
    setSelectedRegions(
      (regions) => (
        regions.filter((currentRegion) => (
          !checkRegionEquality(regionToDelete, currentRegion)
        ))
      )
    );
  };

  const handleCoordsDelete = (coords) => {
    // turn the nested array into a string for easy comparison
    const coordsToDelete = JSON.stringify(coords);

    setMapCoords((prevCoords) => prevCoords.filter((current) => {
      // look through the existing coords and remove the one that matches
      if (coordsToDelete === JSON.stringify(current)) return false;

      return true;
    }));
  };

  const handleCloseSnackbar = () => {
    setShowSnackbar(false);
  };

  const displaySearch = () => (
    <Box marginY={2}>
      <Typography
        variant="subtitle1"
        align="center"
        className={classes.explainer}
      >
        Search for regions by place name, from Country to Admin level 3
      </Typography>
      <form>
        <div className={classes.searchContainer}>
          { searchResults.length ? (
            <Autocomplete
              openOnFocus
              disableClearable
              options={getAutocompleteOptions()}
              className={classes.input}
              inputValue={inputValue}
                // keep track of inputValue and autocompleteValue
                // separately, so that the user can still type
              onChange={(e, newValue) => {
                setAutocompleteValue(newValue);
              }}
              onInputChange={(e, newValue) => {
                setInputValue(newValue);
              }}
              getOptionSelected={(opt, input) => checkRegionEquality(opt, input)}
              getOptionLabel={(option) => formatRegionLabel(option)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoFocus
                  variant="outlined"
                />
              )}
            />
          )
            : (
              <TextField
                autoFocus
                data-test="modelFormRegionSearch"
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                className={classes.input}
                value={searchQuery}
                variant="outlined"
              />
            )}
          <div className={classes.buttonContainer}>
            <Button
              className={classes.regionButton}
              color="secondary"
              data-test="modelFormRegionSearchBtn"
              disableElevation
              onClick={(e) => {
                e.preventDefault();
                if (searchResults.length) {
                  onRegionSubmit();
                } else {
                  setSearchResults(search(searchQuery));
                }
              }}
              size="large"
              type="submit"
              variant="contained"
            >
              {searchResults.length ? 'Add Region' : 'Search'}
            </Button>
            <Button
              disabled={!searchResults.length}
              data-test="modelFormRegionClearBtn"
              onClick={() => clearAutocomplete()}
              size="large"
              variant="outlined"
            >
              Clear Results
            </Button>
          </div>
        </div>
      </form>
    </Box>
  );

  return (
    <div>
      <Box marginY={2}>
        <Paper elevation={0} className={classes.chipsContainerParent}>
          <Typography variant="h6" align="center">Selected Regions</Typography>
          <div className={classes.chipsContainer}>
            {/* map through both the region names and coordinates here */}
            {selectedRegions.map((region) => (
              <li key={region.value + region.level + region.country}>
                <Chip
                  label={formatRegionLabel(region)}
                  className={classes.chip}
                  onDelete={() => handleChipDelete(region)}
                />
              </li>
            ))}
            {mapCoords.map((coords) => (
              <li key={coords}>
                <Chip
                  label={
                    `${coords[0][0]} ${coords[0][1]}, ${coords[1][0]} ${coords[1][1]}`
                  }
                  className={classes.chip}
                  onDelete={() => handleCoordsDelete(coords)}
                />
              </li>
            ))}
          </div>
        </Paper>
      </Box>

      <Box display="flex" justifyContent="center" marginY={2}>
        <Button
          onClick={() => setShowSearch(!showSearch)}
          data-test="modelFormExpandRegionBtn"
          size="large"
          startIcon={
            showSearch ? <RemoveCircleOutlineIcon /> : <AddCircleOutlineIcon />
          }
        >
          Add Regions By Name
        </Button>
      </Box>
      { showSearch && displaySearch() }

      <Box display="flex" alignItems="center">
        <div className={classes.line} />
        <Typography variant="subtitle1">And / Or</Typography>
        <div className={classes.line} />
      </Box>

      <Box display="flex" justifyContent="center" marginY={2}>
        <Button
          onClick={() => setShowMap(!showMap)}
          data-test="modelFormExpandCoordsBtn"
          size="large"
          startIcon={
            showMap ? <RemoveCircleOutlineIcon /> : <AddCircleOutlineIcon />
          }
        >
          Add Regions By Coordinates
        </Button>
      </Box>

      <ModelRegionMap mapCoords={mapCoords} updateMapCoords={setMapCoords} showMap={showMap} />

      {!autoSave && (
        <div className={classes.buttonContainer}>
          <Button
            onClick={() => onBack()}
          >
            Back
          </Button>
          <Button
            color="primary"
            data-test="modelFormSubmitBtn"
            onClick={() => handleNext(parseRegions(selectedRegions, mapCoords))}
            variant="contained"
          >
            Submit Model
          </Button>
        </div>
      )}

      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        autoHideDuration={10000}
        message={`No results found for ${snackbarText}`}
        onClose={handleCloseSnackbar}
        open={showSnackbar}
        action={(
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleCloseSnackbar}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      />
    </div>
  );
}

export default ModelRegionForm;
