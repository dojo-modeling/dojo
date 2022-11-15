import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import CloudDoneIcon from '@material-ui/icons/CloudDone';

/**
 *
 * */
export default withStyles(({ spacing }) => ({
  root: {
    padding: [[spacing(6), spacing(4), spacing(2), spacing(4)]],
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    marginBottom: spacing(3),
  },
  wrapper: {
    flex: 1,
    flexDirection: 'column',

    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(3rem, auto))',
    gridTemplateRows: 'repeat(8, minmax(2rem, auto))'
  },
  contents: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(3),

    gridColumn: '2 / 6',
    gridRow: '2 / 5',
  },
  icon: {
    fontSize: '8rem', color: '#8cd9a1'
  }
}), { name: 'SubmitSuccess' })(({ classes, datasetInfo }) => (
  <Container
    className={classes.root}
    component="main"
    maxWidth="xl"
  >

    <div className={classes.wrapper}>
      <Paper
        elevation={3}
        className={classes.contents}
      >

        <CloudDoneIcon className={classes.icon} />

        <br />

        <Typography
          variant="h5"
          paragraph
        >
          Your dataset has been successfully registered
        </Typography>

        <div>
          <Button
            color="primary"
            component="a"
            href="/datasets/register"
            size="large"
          >
            Register Another Dataset
          </Button>
            &nbsp;
          <Button
            size="large"
            to={`/dataset_summary?dataset=${datasetInfo?.id}`}
            component={Link}
          >

            View in Dojo
          </Button>
        </div>

      </Paper>
    </div>

  </Container>
));
