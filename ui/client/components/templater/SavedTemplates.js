import React from 'react';

import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';

import Drawer from '../Drawer';

const SavedTemplates = ({
  open, onClose, templates, setHoveredHighlight
}) => (

  <Drawer
    open={open}
    onClose={() => onClose()}
    anchorPosition="right"
    noConfirm
    PaperProps={{ variant: 'outlined' }}
  >
    <Typography variant="h6">All parameters for this file</Typography>
    <List dense>
      {templates.map((template, i) => (
        <React.Fragment key={template.start + template.end}>
          <ListItem
            onMouseEnter={() => setHoveredHighlight(template)}
            onMouseLeave={() => setHoveredHighlight(null)}
          >
            <ListItemText
              component="div"
              primary={(
                <Typography variant="body2">
                  Parameter text: {template.text}
                </Typography>
              )}
              secondary={(
                <Typography component="div" variant="body2" color="textSecondary">
                  <Typography variant="inherit" component="p">
                    {`Name: ${template.annotation?.name}`}
                  </Typography>
                  <Typography variant="inherit" component="p">
                    {`Description: ${template.annotation?.description}`}
                  </Typography>
                </Typography>
              )}
              disableTypography
            />
          </ListItem>
          {/* only show the divider between list items */}
          {i !== templates.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  </Drawer>
);

export default SavedTemplates;
