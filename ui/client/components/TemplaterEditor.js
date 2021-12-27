import React, { useEffect } from 'react';

import { LinearProgress } from '@material-ui/core';

import { useDirective } from './SWRHooks';

const templaterRef = React.createRef();

const _sendPostMessage = (msg) => {
  console.log('sending post message to templater:', msg);
  if (templaterRef && templaterRef.current) {
    templaterRef.current.contentWindow.postMessage(JSON.stringify(msg), '*');
  }
};

const templaterShouldSave = () => {
  _sendPostMessage({ type: 'save_clicked' });
};

const templaterShouldLoad = (e) => {
  if (!e.editor_content || !e.content_id) {
    return; // not sending empty message
  }
  _sendPostMessage({
    type: 'file_opened',
    editor_content: e.editor_content,
    content_id: e.content_id,
    cwd: e.cwd,
  });
};

function TemplaterEditor({
  isSaving,
  mode,
  modelInfo,
  setIsSaving,
  setIsTemplaterOpen,
  templaterContents,
}) {
  useEffect(() => {
    // isSaving is triggered by the parent's save button
    if (isSaving) {
      // now we send a message to the templater app telling it to save
      templaterShouldSave();
    }
  }, [isSaving]);

  const { mutateDirective } = useDirective(modelInfo.id);

  const editorUrl = `/api/templater/?model=${modelInfo.id}&mode=${mode}`;

  useEffect(() => {
    const registerListeners = () => {
      window.onmessage = function templaterOnMessage(e) {
        let postMessageBody;

        try {
          postMessageBody = JSON.parse(e.data);
        } catch {
          return; // not a json event
        }

        switch (postMessageBody.type) {
          case 'editor_loaded':
            // editor has loaded, send in the contents
            templaterShouldLoad(templaterContents);
            break;
          case 'params_saved':
            if (mode === 'directive') {
              // templater sets the directive, so we just want to tell SWR to update it
              // but we need this timeout or the change may not have taken place yet
              // because dojo can be slow sometimes
              setTimeout(() => mutateDirective(), 1000);
            }
            // tell the parent that we are done saving
            setIsSaving(false);
            // close the full screen dialog
            setIsTemplaterOpen(false);
            break;
          case 'params_not_saved':
            setIsTemplaterOpen(true); // keep templater open
            setIsSaving(false); // stop the saving spinner
            break;
          default:
            // stop the spinner and throw an error
            setIsSaving(false);
            throw new Error(`There was an error: ${postMessageBody}`);
        }
      };
    };

    registerListeners();
  }, [mutateDirective, setIsSaving, setIsTemplaterOpen, mode, templaterContents]);

  return (
    <div>
      { isSaving ? <LinearProgress /> : null }
      <iframe
        id="templater"
        title="templater"
        style={{ height: 'calc(100vh - 70px)', width: '100%' }}
        src={editorUrl}
        ref={templaterRef}
      />
    </div>
  );
}

export default TemplaterEditor;
