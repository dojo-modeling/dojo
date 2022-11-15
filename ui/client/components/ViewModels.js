import React, { useEffect, useState } from 'react';

import axios from 'axios';


import AutorenewIcon from '@material-ui/icons/Autorenew';
import Button from '@material-ui/core/Button';
import CheckOutlinedIcon from '@material-ui/icons/CheckOutlined';
import CloudDoneOutlinedIcon from '@material-ui/icons/CloudDoneOutlined';
import Container from '@material-ui/core/Container';
import { DataGrid } from '@material-ui/data-grid';
import ErrorOutlineOutlinedIcon from '@material-ui/icons/ErrorOutlineOutlined';
import HelpIcon from '@material-ui/icons/Help';
import { Link } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import { useHistory } from 'react-router-dom';

import ExpandableDataGridCell from './ExpandableDataGridCell';
import LoadingOverlay from './LoadingOverlay';
import Search from './SearchItems';

const useStyles = makeStyles((theme) => ({
  root: {
    padding: [[theme.spacing(10), theme.spacing(2), theme.spacing(2)]],
  },
  gridContainer: {
    height: '400px',
    width: '1800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  published: {
    display: 'flex',
    alignItems: 'center',
  },
  check: {
    color: theme.palette.success.light,
    marginBottom: '4px',
    marginLeft: '4px',
  },
  error: {
    color: theme.palette.error.light,
    marginBottom: '4px',
    marginLeft: '4px',
  },
  unknownStatus: {
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
  aboveTableWrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}));

const addStatusesToModels = (models, statuses) => models.map(
  (model) => ({ ...model, last_run_status: statuses[model.id] })
);

const fetchStatuses = async (modelIDs) => {
  const url = '/api/dojo/models/status';
  const request = axios.post(url, modelIDs);
  request.then((response) => console.log('request for /status response:', response));
  const statuses = request.then((response) => response.data);
  return statuses;
};

const fetchModels = async (
  includeStatuses, setModels, setModelsLoading, setModelsError, scrollId
) => {
  if (!scrollId) {
    // only do this for the first call to fetchModels, when we don't have a scrollId
    // so we don't show the full page spinner for every subsequent set of models
    setModelsLoading(true);
  }

  const url = scrollId
    ? `/api/dojo/models/latest?scroll_id=${scrollId}` : '/api/dojo/models/latest';
  const modelsRequest = axios.get(url).then(
    (response) => {
      console.log('request for /latest response:', response);
      const modelsData = response.data;
      return modelsData;
    }
  );

  let preparedModels = null;
  if (includeStatuses) {
    const statusesRequest = modelsRequest.then((modelsData) => fetchStatuses(
      modelsData.results.map((model) => model.id)
    ));
    preparedModels = Promise.all([modelsRequest, statusesRequest]).then(
      ([modelsData, statuses]) => {
        const modelsWithStatuses = addStatusesToModels(modelsData.results, statuses);
        setModels((prev) => prev.concat(modelsWithStatuses));
        return modelsData.scroll_id;
      }
    );
  } else {
    preparedModels = modelsRequest.then((modelsData) => {
      setModels((prev) => prev.concat(modelsData.results));
      return modelsData.scroll_id;
    });
  }
  preparedModels.then((newScrollId) => {
    setModelsLoading(false);
    // when there's no scroll id, we've hit the end of the results
    if (newScrollId) {
    // if we get a scroll id back, there are more results
    // so call fetchModels again to fetch the next set
      fetchModels(includeStatuses, setModels, setModelsLoading, setModelsError, newScrollId);
    }
  });
  preparedModels.catch((error) => {
    console.log('error:', error);
    setModelsError(true);
  });
};

const filterKeys = [
  'category',
  'commit_message',
  'description',
  'domains',
  'family_name',
  'geography.country',
  'geography.admin1',
  'geography.admin2',
  'geography.admin3',
  'id',
  'maintainer.name',
  'maintainer.email',
  'maintainer.organization',
  'name',
];

const ViewModels = ({
  includeStatuses = true
}) => {
  const history = useHistory();
  const classes = useStyles();
  const [models, setModels] = useState([]);
  const [modelsError, setModelsError] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [displayedModels, setDisplayedModels] = useState([]);
  const [displayUnpublished, setDisplayUnpublished] = useState(true);

  const [searchedModels, setSearchedModels] = useState(null);

  useEffect(() => {
    fetchModels(includeStatuses, setModels, setModelsLoading, setModelsError);
    document.title = 'View Models - Dojo';
  }, [includeStatuses]);

  useEffect(() => {
    setDisplayedModels(models);
  }, [models]);

  const toggleDisplayUnpublished = () => {
    if (displayUnpublished) {
      const filtered = models.filter((model) => (model.is_published));
      setDisplayedModels(filtered);
      setDisplayUnpublished(false);
    } else {
      setDisplayedModels(models);
      setDisplayUnpublished(true);
    }
  };

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

  const viewModelClick = (modelId) => {
    history.push(`/summary/${modelId}`);
  };

  const expandableCell = ({ value, colDef }) => (
    <ExpandableDataGridCell
      value={value}
      width={colDef.computedWidth}
    />
  );

  const lastRunStatus = !includeStatuses ? {} : {
    field: 'last_run_status',
    headerName: 'Status',
    width: 120,
    renderCell: ({ value }) => (
      <div className={classes.published}>
        {value === 'success' ? <CheckOutlinedIcon className={classes.check} />
          : value === 'failed' ? <ErrorOutlineOutlinedIcon className={classes.error} />
            : value === 'running' ? <AutorenewIcon className={classes.unknownStatus} />
              : <HelpIcon className={classes.unknownStatus} /> }
      </div>
    ),
  };

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
    lastRunStatus,
    {
      field: 'is_published',
      headerName: 'Published',
      width: 140,
      renderCell: ({ value }) => (
        <div className={classes.published}>
          {value === true && <CloudDoneOutlinedIcon className={classes.check} />}
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
          data-test="modelSummaryLink"
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
        <div className={classes.aboveTableWrapper}>
          <Search
            name="Model"
            searchKeys={filterKeys}
            setSearch={setSearchedModels}
            items={displayedModels}
          />
          <Button
            component={Link}
            size="large"
            variant="outlined"
            color="primary"
            disableElevation
            to="/model"
          >
            Register a New Model
          </Button>
          <Button
            color="primary"
            disableElevation
            variant="outlined"
            size="large"
            onClick={toggleDisplayUnpublished}
          >
            {displayUnpublished ? 'Hide Unpublished Models' : 'Show Unpublished Models'}
          </Button>
        </div>
        <DataGrid
          autoHeight
          columns={columns}
          rows={searchedModels !== null ? searchedModels : displayedModels}
        />
      </div>
    </Container>
  );
};

export default ViewModels;
