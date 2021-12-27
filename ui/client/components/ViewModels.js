import React, { useEffect, useState } from 'react';

import axios from 'axios';

import Button from '@material-ui/core/Button';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import Container from '@material-ui/core/Container';
import { DataGrid } from '@material-ui/data-grid';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';

import { useHistory } from 'react-router-dom';

import ExpandableDataGridCell from './ExpandableDataGridCell';
import LoadingOverlay from './LoadingOverlay';
import SearchModels from './SearchModels';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(2)]],
  },
  gridContainer: {
    height: '400px',
    width: '1600px',
    margin: '0 auto',
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  published: {
    display: 'flex',
    alignItems: 'center',
  },
  publishedCheck: {
    color: theme.palette.success.light,
    marginBottom: '4px',
    marginLeft: '4px',
  },
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

const getModels = async (setModels, setModelsError, setModelsLoading, scrollId) => {
  if (!scrollId) {
    // only do this for the first call to getModels, when we don't have a scrollId
    // so we don't show the full page spinner for every subsequent set of models
    setModelsLoading(true);
  }

  const url = scrollId
    ? `/api/dojo/models/latest?scroll_id=${scrollId}` : '/api/dojo/models/latest';
  axios.get(url)
    .then((response) => {
      console.log('request for /latest response:', response);
      setModels((prev) => {
        setModelsLoading(false);
        return prev.concat(response.data?.results);
      });

      // when there's no scroll id, we've hit the end of the results
      if (response.data?.scroll_id) {
        // if we get a scroll id back, there are more results
        // so call getModels again to fetch the next set
        getModels(setModels, setModelsError, setModelsLoading, response.data?.scroll_id);
      }
    })
    .catch((error) => {
      console.log('error:', error);
      setModelsError(true);
    });
};

function ViewModels() {
  const history = useHistory();
  const classes = useStyles();
  const [models, setModels] = useState([]);
  const [modelsError, setModelsError] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [searchedModels, setSearchedModels] = useState(null);

  useEffect(() => {
    // only do this once when the page loads
    getModels(setModels, setModelsError, setModelsLoading);
  }, []);

  if (modelsLoading) {
    return <LoadingOverlay text="Loading models" />;
  }

  if (modelsError) {
    return (
      <LoadingOverlay
        text="There was an error loading the list of all models"
        error
      />
    );
  }

  if (!models?.length) {
    return <LoadingOverlay text="No Models Found" error />;
  }

  const viewModelClick = (modelId) => {
    history.push(`/summary?model=${modelId}`);
  };

  const expandableCell = ({ value, colDef }) => (
    <ExpandableDataGridCell
      value={value}
      width={colDef.computedWidth}
    />
  );

  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      renderCell: expandableCell,
      width: 150,
    },
    {
      field: 'family_name',
      headerName: 'Family Name',
      renderCell: expandableCell,
      width: 170,
    },
    {
      field: 'created_at',
      headerName: 'Last Updated',
      valueFormatter: (params) => (
        new Date(params.value).toLocaleDateString(
          'en-US',
          {
            timeZone: 'utc',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          },
        )
      ),
      width: 170,
    },
    {
      field: 'description',
      headerName: 'Description',
      renderCell: expandableCell,
      width: 280,
    },
    { field: 'id', headerName: 'ID', width: 300 },
    {
      field: 'commit_message',
      headerName: 'Commit Message',
      renderCell: expandableCell,
      width: 270,
    },
    {
      field: 'is_published',
      headerName: 'Status',
      width: 120,
      renderCell: ({ value }) => (
        <div className={classes.published}>
          {value === true ? 'Published' : 'Unpublished'}
          {value === true && <CheckBoxIcon className={classes.publishedCheck} />}
        </div>
      ),
    },
    {
      field: 'link',
      headerName: ' ',
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Button
          onClick={() => viewModelClick(params.row.id)}
          variant="outlined"
        >
          View Model
        </Button>
      ),
      width: 130
    },
  ];

  return (
    <Container
      className={classes.root}
      component="main"
      maxWidth="xl"
    >
      <Typography
        className={classes.header}
        component="h3"
        variant="h4"
        align="center"
      >
        All Models
      </Typography>
      <div className={classes.gridContainer}>
        <SearchModels setSearchedModels={setSearchedModels} models={models} />
        <DataGrid
          autoHeight
          columns={columns}
          rows={searchedModels !== null ? searchedModels : models}
        />
      </div>
    </Container>
  );
}

export default ViewModels;
