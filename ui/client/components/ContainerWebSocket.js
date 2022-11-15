import React, {
  useEffect,
  useState,
} from 'react';

import { saveAs } from 'file-saver';

import BasicAlert from './BasicAlert';
import {
  useAccessories, useConfigs, useLock, useShellHistory
} from './SWRHooks';

import {
  useWebSocketUpdateContext,
} from '../context';

const storeFileRequest = async (info) => {
  const rsp = await fetch('/api/dojo/terminal/file', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(info)
  });

  if (!rsp.ok) {
    throw new Error(`Failed to send file info ${rsp.status}`);
  }

  return rsp.json();
};

const storeAccessoryRequest = async (info) => {
  const rsp = await fetch('/api/dojo/dojo/accessories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(info)
  });

  if (!rsp.ok) {
    throw new Error(`Failed to send accessory info ${rsp.status}`);
  }

  return rsp;
};

const ContainerWebSocket = ({
  modelId,
  setEditorContents, openEditor,
  setTemplaterOpen, setTemplaterContents, setTemplaterMode,
  setAnnotationInfo, setIsModelOutputOpen, setModelOutputFile, setUploadFilesOpen, setUploadPath
}) => {
  const { register, unregister } = useWebSocketUpdateContext();
  const [accessoryAlert, setAccessoryAlert] = useState(false);

  const { mutateAccessories } = useAccessories(modelId);
  const { lock } = useLock(modelId);
  const { configs } = useConfigs(modelId);

  const { mutateShellHistory } = useShellHistory(modelId);

  useEffect(() => {
    const onMessage = () => {
      mutateShellHistory();
    };

    const onOldCommand = async (data) => {
      const { command, cwd } = JSON.parse(data);

      const s = command.trim();
      if (s.startsWith('edit ')) {
        const p = `${s.substring(5)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;
        const rsp = await fetch(
          `/api/terminal/container/${modelId}/ops/cat?path=${encodeURIComponent(f)}`
        );
        if (rsp.ok) {
          setEditorContents({ text: await rsp.text(), file: f });
          openEditor();
        }
      } else if (s.startsWith('config ')) {
        // get file path user specified
        const path = `${s.substring('config '.length)}`;
        const fullPath = (path.startsWith('/')) ? path : `${cwd}/${path}`;

        // load that file's contents
        const rsp = await fetch(
          `/api/terminal/container/${modelId}/ops/cat?path=${encodeURIComponent(fullPath)}`
        );
        if (rsp.ok) {
          const fileContent = await rsp.text();
          setTemplaterContents({
            editor_content: fileContent,
            content_id: fullPath,
          });
          // set the mode to config rather than directive
          setTemplaterMode('config');
          setTemplaterOpen(true); // open the <FullScreenDialog>
        }
      } else if (s.startsWith('tag ')) {
        const p = `${s.substring(4)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;


        const { id: reqid } = await storeFileRequest({
          model_id: modelId,
          file_path: f,
          request_path: `/container/${modelId}/ops/cat?path=${encodeURIComponent(f)}`
        });

        setModelOutputFile(`${f}`);
        setAnnotationInfo(`/api/modelOutput/byom?reqid=${reqid}`);
        setIsModelOutputOpen(true);
      } else if (s.startsWith('accessory ')) {
        const p = `${s.substring(10)}`;
        const f = (p.startsWith('/')) ? p : `${cwd}/${p}`;
        const f_ = (f.includes(' ')) ? f.split(' ')[0] : f;
        const c = (f.includes(' ')) ? p.split(' ').slice(1, p.split(' ').length).join(' ').replaceAll('"', '') : null;

        await storeAccessoryRequest({
          model_id: modelId,
          path: f_,
          caption: c
        }).then(() => {
          setAccessoryAlert(true);
          // give this 1s for elasticsearch to catch up
          setTimeout(() => mutateAccessories(), 1000);
        });
      }
    };

    const onBlocked = async (data) => {
      // id is the dojo command, meta contains the command specific details
      const { id, meta } = JSON.parse(data);

      if (id === 'edit') {
        // file editor
        const rsp = await fetch(
          `/api/terminal/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.file)}`
        );
        if (rsp.ok) {
          setEditorContents({ text: await rsp.text(), file: meta.file });
          openEditor();
        }
      } else if (id === 'config') {
        // load the file's contents
        const rsp = await fetch(
          `/api/terminal/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.file)}`
        );

        // fetch an existing config if one exists, so we don't write a new blank config on top
        const existingConfig = configs?.find((config) => config.path === meta.file);

        if (rsp.ok) {
          const fileContent = await rsp.text();
          setTemplaterContents({
            editor_content: fileContent,
            content_id: existingConfig ? existingConfig.path : meta.file,
            parameters: existingConfig?.parameters,
            md5_hash: meta.md5,
          });
          // set the mode to config rather than directive
          setTemplaterMode('config');
          setTemplaterOpen(true); // open the <FullScreenDialog>
        }
      } else if (id === 'annotate') {
        // modelOutput
        const { id: reqid } = await storeFileRequest({
          model_id: modelId,
          file_path: meta.files[0],
          request_path: `/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.files[0])}`
        });

        setModelOutputFile(`${meta.files[0]}`);
        setAnnotationInfo({
          model_id: modelId,
          file_path: meta.files[0],
          pattern: meta.pattern,
          request_path: `/container/${modelId}/ops/cat?path=${encodeURIComponent(meta.files[0])}`
        });
        setIsModelOutputOpen(true);
      } else if (id === 'tag') {
        // accessory annotation
        await storeAccessoryRequest({
          model_id: modelId,
          path: meta.file,
          caption: meta.caption
        }).then(() => {
          setAccessoryAlert(true);
          // give this 1s for elasticsearch to catch up
          setTimeout(() => mutateAccessories(), 1000);
        });
      } else if (id === 'upload') {
        // set cwd and modal open to upload files
        setUploadPath(meta.cwd);
        setUploadFilesOpen(true);
      } else if (id === 'download') {
        // Download file from container.

        const fileName = meta.file.split('/').pop();
        const url = `/api/terminal/container/${modelId}/ops/cat?path=${meta.file}`;
        fetch(url, {
          method: 'GET',
        })
          .then((response) => response.blob())
          .then((blob) => {
            saveAs(blob, fileName);
          })
          .catch((error) => {
            console.log(error);
          });
      }
    };

    if (lock) {
      register('term/message', onMessage);
      register('dojo/command', onBlocked);
      register('term/blocked', onOldCommand);
    }

    return (() => {
      unregister('term/message', onMessage);
      unregister('dojo/command', onBlocked);
      unregister('term/blocked', onOldCommand);
    });
  }, [
    mutateShellHistory,
    lock,
    openEditor,
    register,
    unregister,
    setEditorContents,
    setTemplaterOpen,
    setTemplaterContents,
    setTemplaterMode,
    setModelOutputFile,
    setAnnotationInfo,
    setIsModelOutputOpen,
    setUploadFilesOpen,
    setUploadPath,
    modelId,
    mutateAccessories,
    configs,
  ]);

  return (
    <>
      <BasicAlert
        alert={{
          message: 'Your accessory was successfully added',
          severity: 'success',
        }}
        visible={accessoryAlert}
        setVisible={setAccessoryAlert}
      />
    </>
  );
};

export default ContainerWebSocket;
