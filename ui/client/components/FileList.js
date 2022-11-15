import React, { useState } from 'react';

import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Typography from '@material-ui/core/Typography';

import DeletionDialog from './DeletionDialog';
import FileCardList from './FileCardList';

import { useConfigs, useOutputFiles } from './SWRHooks';

const FileTile = ({ item }) => {
  const fileParts = new URL(`file://${item}`).pathname.split('/');
  const fileName = fileParts.pop();
  const filePath = fileParts.join('/').replace('/home/terminal/', '~/');
  return (
    <span>
      <Typography variant="subtitle1" noWrap>{fileName}</Typography>
      <Typography variant="caption" noWrap component="div">{filePath}</Typography>
    </span>
  );
};

const FileList = ({
  fileType, model, disabledMode, setTemplaterMode, setTemplaterContents,
  setTemplaterOpen, setModelOutputFile, setModelOutputOpen, hideExpandHeader,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionSelection, setDeletionSelection] = useState(() => ({
    type: null, id: null, description: 'Hello world',
  }));

  const {
    configs, configsLoading, configsError, mutateConfigs
  } = useConfigs(model?.id);
  const {
    outputs, outputsLoading, outputsError, mutateOutputs
  } = useOutputFiles(model.id);

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeletionSelection();
  };

  const handleDeleteItem = async () => {
    console.log('deleting', deletionSelection);
    let url = `/api/dojo/dojo/${deletionSelection.type}/${deletionSelection.id}`;
    // Add params to end of URL is params included in deletionSelection
    if (deletionSelection?.params) {
      const paramList = [];
      Object.entries(deletionSelection.params).forEach(([key, val]) => {
        paramList.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      });
      url = `${url}?${paramList.join('&')}`;
    }

    const resp = await fetch(
      url,
      {
        method: 'DELETE',
      }
    );

    if (resp.ok) {
      handleDeleteDialogClose();

      if (deletionSelection.type === 'config') {
        // mutate locally, filtering out the config that we just deleted
        mutateConfigs((prev) => prev.filter((config) => (
          config?.path !== deletionSelection?.params?.path
        )), false);

        // and then wait until elasticsearch has caught up before requesting new data from dojo
        setTimeout(() => mutateConfigs(), 5000);
      } else if (deletionSelection.type === 'outputfile') {
        // mutate locally and then fetch from dojo once ES has caught up
        mutateOutputs((prev) => prev.filter((output) => (
          output?.id !== deletionSelection?.id
        )), false);
        setTimeout(() => mutateOutputs(), 5000);
      }
    } else {
      console.log(`There was an error deleting "${deletionSelection.description}"`);
    }
  };

  const openConfigParameterAnnotation = async (item) => {
    const response = await fetch(
      `/api/terminal/container/${model.id}/ops/cat?path=${encodeURIComponent(item.path)}`
    );

    if (response.ok) {
      const content = await response.text();
      setTemplaterContents({
        editor_content: content,
        content_id: item.path,
        parameters: item.parameters,
        md5_hash: item.md5_hash,
      });

      setTemplaterMode('config');
      setTemplaterOpen(true);
    }
  };

  const renderConfigs = () => (
    <FileCardList
      name="Config"
      files={configs}
      loading={configsLoading}
      error={configsError}
      primaryClickHandler={(config) => openConfigParameterAnnotation(config)}
      primaryIcon={<EditIcon />}
      secondaryClickHandler={async (config) => {
        setDeletionSelection({
          type: 'config',
          id: config.model_id,
          description: config.path,
          params: {
            path: config.path,
          },
        });
        setDeleteDialogOpen(true);
      }}
      hideExpandHeader={hideExpandHeader}
      secondaryIcon={<DeleteIcon />}
      cardContent={(config) => <FileTile item={config.path} />}
      disableClick={disabledMode}
    />
  );

  const renderOutputs = () => (
    <FileCardList
      name="Output"
      files={outputs}
      loading={outputsLoading}
      error={outputsError}
//       primaryClickHandler={(output) => {
//         setModelOutputFile(output);
//         setModelOutputOpen(true);
//       }}
//       primaryIcon={<EditIcon />}
      secondaryClickHandler={(config) => {
        setDeletionSelection({
          type: 'outputfile', id: config.id, description: `${config.name}: ${config.path}`
        });
        setDeleteDialogOpen(true);
      }}
      hideExpandHeader={hideExpandHeader}
      secondaryIcon={<DeleteIcon />}
      disableClick={disabledMode}
      cardContent={(output) => (
        <>
          <Typography variant="subtitle1" noWrap>{output.name}</Typography>
          <Typography variant="caption" noWrap component="div">{output.path}</Typography>
        </>
      )}
      outputs={model?.outputs}
    />
  );

  return (
    <>
      {fileType === 'config' ? renderConfigs() : renderOutputs()}
      <DeletionDialog
        open={deleteDialogOpen}
        itemDescr={deletionSelection?.description}
        deletionHandler={handleDeleteItem}
        handleDialogClose={handleDeleteDialogClose}
      />
    </>
  );
};

export default FileList;
