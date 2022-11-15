import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import LoadingOverlay from './components/LoadingOverlay';

export const WebSocketContext = createContext({});
export const WebSocketUpdateContext = createContext({});
export const useWebSocketContext = () => useContext(WebSocketContext);
export const useWebSocketUpdateContext = () => useContext(WebSocketUpdateContext);

export const WebSocketContextProvider = ({ url, children }) => {
  const websocket = useRef(null);
  const listeners = useRef({});
  const clientId = useRef(null);

  const isWebsocketLoaded = () => {
    // if we have no websocket at all, return false
    if (!websocket || !websocket.current) return false;
    // otherwise only return true if our readyState equals the OPEN value
    return websocket.current?.readyState === websocket.current?.OPEN;
  };

  // use this state to keep track of when to render a websocket wrapped component
  const [websocketLoaded, setWebsocketLoaded] = useState(isWebsocketLoaded());

  useEffect(() => {
    // only set up a new Websocket if we don't currently have one
    if (!websocket.current) {
      websocket.current = new WebSocket(url);
    }
  }, [url]);

  const dispatch = (channel, payload) => {
    // grab the current channel's handlers out of the listeners ref, defaulting to []
    const channelHandlers = listeners.current[channel] ?? [];

    channelHandlers.forEach((handler) => {
      handler.call(undefined, payload);
    });
  };

  const setWebSocketId = (id) => {
    clientId.current = id;
    console.info(`New Client ID ${clientId.current}`);
  };

  const getWebSocketId = () => clientId.current;

  const emit = useCallback(async (channel, payload) => {
    websocket.current.send(JSON.stringify({ channel, payload }));
  }, []);

  const unregister = useCallback((channel, handler) => {
    // remove everything that doesn't match the current handler from listeners for this channel
    // because we're just deleting this specific handler for this channel
    listeners.current[channel] = (listeners.current[channel] ?? [])
      .filter((currentHandler) => currentHandler !== handler);
    // if there are no handlers attached to this channel after the above, delete the channel
    if (!listeners.current[channel].length) {
      delete listeners.current[channel];
    }
  }, []);

  const register = useCallback((channel, handler) => {
    // call unregister in case we previously had this channel/handler combo registered
    unregister(channel, handler);
    // set up our listeners ref at this channel to be connected to our handler
    listeners.current[channel] = [...listeners.current[channel] ?? [], handler];
    // return unregister - I'm not sure this is being used anywhere - AG
    return () => unregister(channel, handler);
  }, [unregister]);

  const awaitEmit = async (channel, payload, responseChannel) => {
    let handler = null;

    // socket promise
    const p1 = new Promise((r) => {
      handler = (d) => r(d);
      register(responseChannel, handler);
      emit(channel, payload);
    });

    // timeout
    const p2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error(`awaitEmit:: Timeout waiting for response on ${responseChannel}`));
      }, 3000);
    });

    const resp = await Promise.race([p2, p1]).finally(() => {
      // cleanup handlers
      if (handler !== null) {
        unregister(responseChannel, handler);
      }
    });

    console.info(`Resolved response in: ${channel}, out: ${responseChannel}, resp: ${resp}`);
    return resp;
  };

  const closeSocket = () => {
    try {
      websocket.current.close();
    } finally {
      console.debug('Websocket Close called');
    }
  };

  useEffect(() => {
    console.info('websocket connecting...');
    // websocket.current = new WebSocket(url);
    websocket.current.onopen = () => {
      console.info('websocket opened');
    };
    websocket.current.onerror = (evt) => {
      console.debug(`websocket error ${evt}`);
    };
    websocket.current.onclose = () => {
      console.info('websocket closed');
    };

    websocket.current.onmessage = (evt) => {
      console.debug(evt.data);
      const data = JSON.parse(evt.data);

      if (data.channel === 'fatal') {
        console.error(`%cServer Error ${data.payload}`, 'background: #f00; color: #fff');
      }

      if (data.channel === 'id') {
        setWebSocketId(data.payload);
        setWebsocketLoaded(isWebsocketLoaded());
        return;
      }

      dispatch(data.channel, data.payload);
    };

    return () => {
      console.info('websocket disconnecting');
      closeSocket();
    };
  }, []);

  // if we haven't hit readyState === OPEN, don't render the wrapped component
  if (!websocketLoaded) {
    return <LoadingOverlay text="Loading..." />;
  }

  return (
    <WebSocketContext.Provider value={{ emit, awaitEmit }}>
      <WebSocketUpdateContext.Provider value={{
        getWebSocketId, register, unregister, closeSocket
      }}
      >
        { children }
      </WebSocketUpdateContext.Provider>
    </WebSocketContext.Provider>
  );
};
