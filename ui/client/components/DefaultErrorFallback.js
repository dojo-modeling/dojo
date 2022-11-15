import React from 'react';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';

/**
 *
 **/
export function DefaultErrorFallback({ error, resetErrorBoundary }) {

  // TODO Send errors to backend to track without user action

  return (
    <Container
      style={{display: 'flex',
              flexDirection: 'column',
              marginTop: '0.5rem',
              padding: '2rem',
              border: '6px solid #DDDDDD33',
              height: 'fit-content',
              textAlign: 'left'}}
      maxWidth="sm">

      <Typography
        variant="h3"
        gutterBottom
      >
        Something Went Wrong
      </Typography>

      <Typography
        variant="body1"
        paragraph
      >
        Try reloading the page.
        Please contact Jataware if the problem persists.
      </Typography>

      <Button
        color="primary"
        size="large"
        variant="outlined"
        style={{width: "50%", alignSelf: 'center'}}
        onClick={resetErrorBoundary}>
        Or, Retry
      </Button>

    </Container>
  );
}
