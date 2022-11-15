import React from 'react';

import './style.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import ReactDOM from 'react-dom';
import {
  Route,
  BrowserRouter as Router,
  Switch,
} from 'react-router-dom';

import { ThemeProvider } from '@material-ui/core/styles';

import NavBar from './components/NavBar';
import ThemeContextProvider from './components/ThemeContextProvider';

// pages
import Admin from './admin';
import DatasetSummary from './dataset_summary';
import LandingPage from './landingpage';
import Model from './model';
import Provision from './provision';
import Provisioning from './provisioning';
import RunLogs from './runlogs';
import RunSummary from './components/RunSummary';
import Summary from './summary';
import Terminal from './terminal';
import theme from './theme';
import ViewDatasets from './components/ViewDatasets';
import ViewModels from './components/ViewModels';
import ViewRuns from './components/ViewRuns';
// import DatasetRegistration from './datasets/Register';
import DatasetRegistrationStepper from './datasets/RegistrationStepper';
import DatasetPreview from './datasets/Preview';
import DatasetAnnotate from './datasets/Annotate';

export default function Main() {
  return (
    <Router>
      <NavBar />
      <Switch>
        <Route component={LandingPage} exact path="/" />
        <Route component={Model} exact path="/model" />
        <Route component={ViewModels} exact path="/models" />
        <Route component={ViewDatasets} exact path="/datasets" />
        <Route component={DatasetAnnotate} exact path="/datasets/annotate" />
        <Route component={DatasetPreview} exact path="/datasets/preview" />
        <Route component={DatasetRegistrationStepper} path="/datasets/:flowslug/:step?/:datasetId?" />
        <Route component={Provision} exact path="/provision/:modelId" />
        <Route component={Provisioning} exact path="/provisioning/:modelId" />
        <Route component={Terminal} exact path="/term/:modelid" />
        <Route component={Summary} exact path="/summary/:modelId" />
        <Route component={DatasetSummary} exact path="/dataset_summary" />
        <Route component={Admin} exact path="/admin" />
        <Route component={ViewRuns} exact path="/runs" />
        <Route component={RunSummary} exact path="/runs/:runid" />
        <Route component={RunLogs} exact path="/runlogs/:runid" />
        <Route path="/*" render={() => <h2>404 Not Found</h2>} />
      </Switch>
    </Router>
  );
}

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <ThemeContextProvider>
      <Main />
    </ThemeContextProvider>
  </ThemeProvider>,
  document.getElementById('app')
);

module.hot.accept();
