import React, { useEffect, useState } from 'react';

import CancelIcon from '@material-ui/icons/Cancel';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import TextField from '@material-ui/core/TextField';
import { makeStyles } from '@material-ui/core/styles';

import Fuse from 'fuse.js';

import BasicAlert from './BasicAlert';

const useStyles = makeStyles((theme) => ({
  searchWrapper: {
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '400px',
    marginRight: theme.spacing(2),
  },
}));

const Search = ({
  setSearch, items, searchKeys, name
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alert, setAlert] = useState({
    severity: 'warning',
    message: ''
  });

  const classes = useStyles();

  useEffect(() => {
    // define this inside the useEffect to ensure stability
    const handleSearch = () => {
      // define our fuse options
      const options = {
        keys: searchKeys,
        // basically just exact string matching
        threshold: 0.1,
        // search anywhere in the strings
        ignoreLocation: true,
      };

      const fuse = new Fuse(items, options);

      const results = fuse.search(searchTerm);

      // we don't need all the fuse stuff, so just parse out the items
      const parsedResults = results.map((model) => model.item);

      // and pass them back to caller
      setSearch(parsedResults);
      // unless we get nothing back, then show the alert
      if (parsedResults.length === 0) {
        setAlert({
          severity: 'warning',
          message: `No results found for ${searchTerm}`,
        });
        setAlertVisible(true);
      }
    };

    // simple pseudo-debounce to prevent searches on every keystroke
    let debounceSearch;
    // only search if we have a search term
    if (searchTerm.length) {
      // create a timeout
      debounceSearch = setTimeout(() => {
        handleSearch();
      }, 300);
    }

    // cancel the timeout if we get back here before it has executed
    return () => clearTimeout(debounceSearch);
  }, [searchTerm, items, setSearch, searchKeys]);

  const clearSearch = () => {
    setSearchTerm('');
    // Displays entire item list when set to null
    setSearch(null);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);

    // if we have no search term, clear everything
    if (event.target.value.length === 0) {
      clearSearch();
    }
  };

  return (
    <div className={classes.searchWrapper}>
      <TextField
        className={classes.searchInput}
        label={`Filter ${name}s`}
        variant="outlined"
        value={searchTerm}
        onChange={handleSearchChange}
        role="searchbox"
        data-test="viewModelsSearchField"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={clearSearch}><CancelIcon /></IconButton>
            </InputAdornment>
          )
        }}
      />
      <BasicAlert
        alert={alert}
        visible={alertVisible}
        setVisible={setAlertVisible}
      />
    </div>
  );
};

export default Search;
