import React, { useState } from 'react';

import Box from '@material-ui/core/Box';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Typography from '@material-ui/core/Typography';

import { makeStyles } from '@material-ui/core/styles';

import FileList from './FileList';
import HelperTip from './HelperTip';
import SummaryAccessories from './SummaryAccessories';
import { useAccessories, useConfigs, useOutputFiles } from './SWRHooks';

// give each tab correct accessibility attributes (according to MUI docs)
const a11yProps = (index) => ({
  id: `file-tab-${index}`,
  'aria-controls': `file-tabpanel-${index}`,
});

const useStyles = makeStyles((theme) => ({
  indicator: {
    margin: [[0, theme.spacing(1)]],
  },
  textWrapper: {
    color: theme.palette.common.white,
  },
}));

function TabPanel(props) {
  const {
    children, value, index, ...other
  } = props;

  const classes = useStyles();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-tabpanel-${index}`}
      aria-labelledby={`file-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Typography component="div" className={classes.textWrapper}>
          <Box p={1}>
            {children}
          </Box>
        </Typography>
      )}
    </div>
  );
}

const ModelFileTabs = ({
  model, setTemplaterMode, setTemplaterContents, setTemplaterOpen,
  setModelOutputOpen, setModelOutputFile,
}) => {
  const [tabValue, setTabValue] = useState(0);

  const { accessories } = useAccessories(model.id);
  const { outputs } = useOutputFiles(model.id);
  const { configs } = useConfigs(model.id);

  const classes = useStyles();

  const handleTabClick = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <>
      <Tabs
        value={tabValue}
        onChange={handleTabClick}
        variant="fullWidth"
        style={{ color: 'white' }}
        indicatorColor="primary"
        classes={{ indicator: classes.indicator }}
      >
        <Tab
          label={(
            <HelperTip
              title="The annotated configuration files with parameters that you would like
                to expose to end users. You can add a configuration file by entering
                'dojo config <filename>' into the terminal"
            >
              {`Configs  (${configs?.length || 0})`}
            </HelperTip>
          )}
          {...a11yProps(0)}
          data-test="fileTabConfigs"
        />
        <Tab
          label={(
            <HelperTip
              title="The annotated output files. You can add an output file by entering
                'dojo annotate <filename>' into the terminal"
            >
              {`Outputs  (${outputs?.length || 0})`}
            </HelperTip>
           )}
          {...a11yProps(1)}
          data-test="fileTabOutputs"
        />
        <Tab
          label={(
            <HelperTip
              title="Tagged output accessory files, such as images or videos. You can add
                an accessory file by entering 'dojo tag <filename>' into the terminal"
            >
              {`Accessories  (${accessories?.length || 0})`}
            </HelperTip>
          )}
          {...a11yProps(2)}
          data-test="fileTabAccessories"
        />
      </Tabs>
      <div style={{ overflowY: 'scroll' }}>
        <TabPanel value={tabValue} index={0}>
          <FileList
            fileType="config"
            model={model}
            setTemplaterMode={setTemplaterMode}
            setTemplaterContents={setTemplaterContents}
            setTemplaterOpen={setTemplaterOpen}
            hideExpandHeader
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <FileList
            fileType="outputfile"
            model={model}
            setModelOutputOpen={setModelOutputOpen}
            setModelOutputFile={setModelOutputFile}
            hideExpandHeader
          />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <SummaryAccessories modelId={model.id} hideExpandHeader />
        </TabPanel>
      </div>
    </>
  );
};

export default ModelFileTabs;
