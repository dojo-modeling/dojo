import React from 'react';

import './style.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import ReactDOM from 'react-dom';
import {
  Route,
  BrowserRouter as Router,
  Switch,
} from 'react-router-dom';
import { ThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import Admin from './admin';
import App from './app';
import Intro from './intro';
import LandingPage from './landingpage';
import Model from './model';
import RunLogs from './runlogs';
import Summary from './summary';
import TermLoading from './term_loading';
import TheKing from './theking';
import ViewModels from './components/ViewModels';

const theme = createMuiTheme({
  palette: {
    // type: 'dark',
    primary: {
      main: '#1976d2',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
    },
    background: {
      default: '#fff'
    },
  },
  body: {
    backgroundColor: '#fff'
  },
  overrides: {
    MuiTableCell: {
      root: {
        padding: 0
      }
    }
  }
});

export default function Main() {
  return (
    <Router>
      <Switch>
        <Route component={LandingPage} exact path="/" />
        <Route component={Model} exact path="/model" />
        <Route component={ViewModels} exact path="/models" />
        <Route component={Intro} exact path="/intro/:modelId" />
        <Route component={TermLoading} exact path="/loadingterm" />
        <Route component={App} exact path="/term/:worker/:modelid" />
        <Route component={Summary} exact path="/summary" />
        <Route component={Admin} exact path="/admin" />
        <Route component={TheKing} exact path="/theking" />
        <Route component={RunLogs} exact path="/runlogs/:runid" />
        <Route path="/*" render={() => <h2>404 Not Found</h2>} />
      </Switch>
    </Router>
  );
}

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Main />
  </ThemeProvider>,
  document.getElementById('app')
);

module.hot.accept();
