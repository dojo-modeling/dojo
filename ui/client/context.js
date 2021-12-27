import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';

import { sleep } from './utils';

export const WebSocketContext = createContext({});
export const WebSocketUpdateContext = createContext({});
export const useWebSocketContext = () => useContext(WebSocketContext);
export const useWebSocketUpdateContext = () => useContext(WebSocketUpdateContext);

export const WebSocketContextProvider = ({ url, children }) => {
  const ws = useRef(new WebSocket(url));
  const Q = useRef({});
  const clientId = useRef(null);

  const dispatch = (channel, payload) => {
    const { [channel]: xs = [] } = Q.current;
    xs.forEach((d) => {
      d.call(undefined, payload);
    });
  };

  const setWebSocketId = (id) => {
    clientId.current = id;
    console.info(`New Client ID ${clientId.current}`);
  };

  const getWebSocketId = () => clientId.current;

  const emit = useCallback(async (channel, payload) => {
    while (ws.current.readyState === ws.current.CONNECTING) {
      await sleep(50); // eslint-disable-line no-await-in-loop
    }
    ws.current.send(JSON.stringify({ channel, payload }));
  }, []);

  const unregister = useCallback((channel, handler) => {
    // eslint-disable-next-line eqeqeq
    Q.current[channel] = (Q.current[channel] ?? []).filter((h) => h != handler);
    if (!Q.current[channel].length) {
      delete Q.current[channel];
    }
  }, []);

  const register = useCallback((channel, handler) => {
    unregister(channel, handler);
    Q.current[channel] = [...Q.current[channel] ?? [], handler];
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
      ws.current.close();
    } finally {
      console.debug('Websocket Close called');
    }
  };

  useEffect(() => {
    console.info('websocket connecting...');
    // ws.current = new WebSocket(url);
    ws.current.onopen = () => {
      console.info('ws opened');
    };
    ws.current.onerror = (evt) => {
      console.debug(`ws error ${evt}`);
    };
    ws.current.onclose = () => {
      console.info('ws closed');
    };

    ws.current.onmessage = (evt) => {
      console.debug(evt.data);
      const data = JSON.parse(evt.data);

      if (data.channel === 'fatal') {
        console.error(`%cServer Error ${data.payload}`, 'background: #f00; color: #fff');
      }

      if (data.channel === 'id') {
        setWebSocketId(data.payload);
        return;
      }

      dispatch(data.channel, data.payload);
    };

    return () => {
      console.info('websocket disconnecting');
      closeSocket();
    };
  }, []);

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
