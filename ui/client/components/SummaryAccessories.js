import React, { useState } from 'react';

import DeleteIcon from '@material-ui/icons/Delete';
import Typography from '@material-ui/core/Typography';

import DeletionDialog from './DeletionDialog';
import FileCardList from './FileCardList';

import { useAccessories } from './SWRHooks';

export default function SummaryAccessories({ modelId, disableClick, hideExpandHeader }) {
  const {
    accessories, accessoriesLoading, accessoriesError, mutateAccessories
  } = useAccessories(modelId);

  const [deleteAccessoryDialogOpen, setDeleteAccessoryDialogOpen] = useState(false);
  const [accessoryToDelete, setAccessoryToDelete] = useState();

  const handleDialogClose = () => {
    setDeleteAccessoryDialogOpen(false);
    setAccessoryToDelete();
  };

  const handleDeleteAccessory = async () => {
    const resp = await fetch(`/api/dojo/dojo/accessories/${accessoryToDelete.id}`, {
      method: 'DELETE',
    });

    if (resp.ok) {
      handleDialogClose();
      // Dojo needs 1 second to update the DB before we can GET the accessories again
      setTimeout(() => mutateAccessories(), 1000);
    } else {
      console.log(`There was an error deleting ${accessoryToDelete.path}`);
    }
  };

  return (
    <>
      <FileCardList
        name="Accessory"
        files={accessories}
        loading={accessoriesLoading}
        error={accessoriesError}
        primaryClickHandler={(accessory) => {
          setAccessoryToDelete(accessory);
          setDeleteAccessoryDialogOpen(true);
        }}
        hideExpandHeader={hideExpandHeader}
        primaryIcon={<DeleteIcon />}
        disableClick={disableClick}
        cardContent={(accessory) => {
          const pathArray = accessory.path.split('/');
          const name = pathArray[pathArray.length - 1];

          return (
            <>
              <Typography variant="subtitle1" noWrap>{name}</Typography>
              <Typography variant="caption" noWrap component="div">{accessory.path}</Typography>
              <Typography variant="caption" noWrap component="div">{accessory.caption}</Typography>
            </>
          );
        }}
      />
      <DeletionDialog
        open={deleteAccessoryDialogOpen}
        itemDescr={accessoryToDelete?.path}
        deletionHandler={handleDeleteAccessory}
        handleDialogClose={handleDialogClose}
      />
    </>
  );
}
