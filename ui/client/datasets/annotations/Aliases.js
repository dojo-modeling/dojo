import React from 'react';

import { FieldArray } from 'formik';
import { withStyles } from '@material-ui/core/styles';

import AddCircleIcon from '@material-ui/icons/AddCircle';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import Button from '@material-ui/core/Button';
import DeleteIcon from '@material-ui/icons/Delete';
import IconButton from '@material-ui/core/IconButton';
import isEmpty from 'lodash/isEmpty';

import { FormAwareTextField } from '../FormFields';

/**
 *
 * */
export const Aliases = withStyles(() => ({
  root: {
  },
  aliases: {
    maxHeight: '14rem',
    overflowY: 'auto',
    listStyle: 'none'
  },
  alias: {
    display: 'flex',
  },
  arrow: {
    display: 'flex',
    alignItems: 'center'
  }
}))(({ classes, aliases, disabled, ...props }) => (
  <FieldArray
    name="aliases"
    render={(arrayHelpers) => (

      <div className={classes.root}>
        <Button
          onClick={() => arrayHelpers.push({ id: aliases.length, current: '', new: '' })}
          color="primary"
          disabled={disabled}
          startIcon={<AddCircleIcon />}
        >
          Add Alias
        </Button>
        <ul className={classes.aliases}>
          {aliases && !isEmpty(aliases)
             && aliases.map((alias, idx) => (
               <li
                 className={classes.alias}
                 key={alias.id}
               >
                 <FormAwareTextField
                   name={`aliases.${idx}.current`}
                   margin="dense"
                   label="Current"
                   disabled={disabled}
                 />

                 <div className={classes.arrow}>
                   <ArrowRightIcon />
                 </div>

                 <FormAwareTextField
                   name={`aliases.${idx}.new`}
                   margin="dense"
                   label="New"
                   disabled={disabled}
                 />

                 {!disabled && (
                   <IconButton
                     color="secondary"
                     onClick={() => arrayHelpers.remove(idx)}
                   >
                     <DeleteIcon />
                   </IconButton>
                 )}
               </li>
             ))}
        </ul>
      </div>
    )}
  />
));
Aliases.displayName = 'Aliases';
