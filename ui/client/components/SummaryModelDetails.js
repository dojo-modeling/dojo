import React from 'react';

import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  subsection: {
    marginLeft: theme.spacing(1),
  },
  modelHeader: {
    fontWeight: 'bold',
  },
}));

function SummaryModelDetails({ model }) {
  const classes = useStyles();

  let parsedCoordinates = [];

  if (model.geography?.coordinates.length) {
    parsedCoordinates = model.geography?.coordinates.map((coords, i, arr) => {
      // only display the separator if we aren't at the end of the list
      const separator = i !== arr.length - 1 ? ', ' : '';

      if (!coords[0].length || !coords[1].length) return null;

      return (
        <span key={coords}>
          {`[${coords[0].join()};${coords[1].join()}]`}
          {separator}
        </span>
      );
    });
  }

  const causemosUrl = `https://causemos.uncharted.software/#/model/${model.family_name}/model-publishing-experiment?datacube_id=${model.id}`;

  // no need to spread the following out onto a million lines
  /* eslint-disable react/jsx-one-expression-per-line */
  return (
    <div>
      <Typography variant="subtitle2" className={classes.modelHeader}>
        Overview:
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model Name: {model.name}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model Website: {model.maintainer?.website}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model Family: {model.family_name}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model Description: {model.description}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model Image: {model.image}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model Start Date: {new Date(model.period?.gte).toLocaleDateString()}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model End Date: {new Date(model.period?.lte).toLocaleDateString()}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Stochastic Model: {model.stochastic}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Model ID: {model.id}
      </Typography>

      {model?.is_published && (
        <Button
          className={classes.causemosButton}
          variant="contained"
          href={causemosUrl}
          disableElevation
        >
          View Model on Causemos
        </Button>
      )}

      <Typography variant="subtitle2" className={classes.modelHeader}>Maintainer:</Typography>
      <Typography variant="body2" className={classes.subsection}>
        Name: {model.maintainer?.name}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Email: {model.maintainer?.email}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Organization: {model.maintainer?.organization}
      </Typography>

      <Typography variant="subtitle2" className={classes.modelHeader}>Geography:</Typography>
      <Typography variant="body2" className={classes.subsection}>
        Country: {model.geography?.country?.join(', ')}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Admin 1: {model.geography?.admin1?.join(', ')}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Admin 2: {model.geography?.admin2?.join(', ')}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Admin 3: {model.geography?.admin3?.join(', ')}
      </Typography>
      <Typography variant="body2" className={classes.subsection}>
        Coordinates: {parsedCoordinates}
      </Typography>
      <Typography variant="subtitle2" className={classes.modelHeader}>Categories:</Typography>
      <Typography variant="body2" className={classes.subsection}>
        {model.category?.join(', ')}
      </Typography>
    </div>
  );
}

export default SummaryModelDetails;
