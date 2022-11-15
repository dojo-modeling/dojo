package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"sync"
	"time"

	ws "github.com/gorilla/websocket"
)

type WebSocketProxyClient struct {
	ID                 string
	Url                url.URL
	Conn               *ws.Conn
	RouteProxyMessages func(WebSocketMessage)
	In                 chan WebSocketMessage
	Out                chan WebSocketMessage
	Open               bool
	mu                 sync.Mutex
	parentCtx          context.Context
	ctx                context.Context
	cancel             context.CancelFunc
}

func NewWebSocketProxyClient(parentCtx context.Context, parentID string, server string,
	messageRouter func(WebSocketMessage), mutex sync.Mutex) *WebSocketProxyClient {
	addr := fmt.Sprintf("%s:6010", server)
	u := url.URL{Scheme: "ws", Host: addr, Path: "/websocket"}
	return &WebSocketProxyClient{
		ID:                 fmt.Sprintf("proxy-%s", parentID),
		Url:                u,
		Conn:               nil,
		RouteProxyMessages: messageRouter,
		In:                 make(chan WebSocketMessage),
		Out:                make(chan WebSocketMessage),
		Open:               false,
		mu:                 mutex,
		parentCtx:          parentCtx,
	}
}

func (c *WebSocketProxyClient) Stop() {
	defer c.Conn.Close()
	if c.Open {
		c.cancel()
		c.Open = false
	} else {
		log.Printf("Proxy WebSocket Stopping %s", c.ID)
	}
	log.Printf("Proxy WebSocket Stopped %s", c.ID)
}

func (c *WebSocketProxyClient) Start() {
	if c.Open {
		log.Printf("Proxy already Running\n")
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	c.ctx = ctx
	c.cancel = cancel

	defer c.Stop()
	c.Open = true
	go c.KeepAlive()
	c.Read()
}

func (c *WebSocketProxyClient) Connect() error {
	if c.Open {
		log.Printf("Proxy already Connected\n")
		return nil
	}

	conn, _, err := ws.DefaultDialer.Dial(c.Url.String(), nil)
	if err != nil {
		LogError("Failed to connect to WebSocket", err)
		return err
	}
	c.Conn = conn
	return nil
}

func (c *WebSocketProxyClient) Read() {
	c.Conn.SetReadDeadline(time.Now().Add(PONG_WAIT))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(PONG_WAIT))
		return nil
	})

	go func() {
		ticker := time.NewTicker(5 * time.Millisecond)
		defer ticker.Stop()
		c.RouteProxyMessages(WebSocketMessage{Channel: "proxy/connected", Payload: "connected"})
		for {
			select {
			case <-ticker.C:
				_, payload, err := c.Conn.ReadMessage()

				if err != nil {
					if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
						LogError("Proxy Conn ReadMessage Error", err)
					} else {
						log.Printf("Proxy Conn Closed Reason: %+v\n", err)
					}
					return
				}

				LogTrace("Proxy Message Payload: %+v", string(payload))
				var message WebSocketMessage
				err = json.Unmarshal(payload, &message)
				if err != nil {
					LogError("Unmarshall error", err)
					return
				}
				LogTrace("Proxy Message Received: %+v", message)
				c.RouteProxyMessages(message)

			case <-c.ctx.Done():
				LogTrace("Proxy Messaged Reader Stopped")
				return
			case <-c.parentCtx.Done():
				LogTrace("Proxy Messaged Reader Stopped by Parent")
				return
			}
		}
	}()

	defer func() {
		log.Printf("Closing Proxy")
		c.mu.Lock()
		err := c.Conn.WriteMessage(ws.CloseMessage, ws.FormatCloseMessage(ws.CloseNormalClosure, ""))
		c.mu.Unlock()
		if err != nil {
			LogError("Proxy Write close:", err)
			return
		}
		log.Printf("Normal Closing Proxy\n")
		return
	}()

	for {
		select {
		case msg := <-c.In:
			c.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
			c.mu.Lock()
			err := c.Conn.WriteJSON(msg)
			c.mu.Unlock()
			if err != nil {
				if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
					LogError("Reply Error", err)
				} else {
					log.Printf("Normal Closing - Proxy Client Closed Reason: %+v\n", err)
				}
				return
			}
		case <-c.ctx.Done():
			LogTrace("Proxy Messaged Writer Stopped")
			return
		case <-c.parentCtx.Done():
			LogTrace("Proxy Messaged Writer Stopped by Parent")
			return
		}
	}
}

func (c *WebSocketProxyClient) KeepAlive() {
	ticker := time.NewTicker(PING_PERIOD)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
			log.Printf("Send Keep Alive Id: %s\n", c.ID)
			c.mu.Lock()
			err := c.Conn.WriteMessage(ws.PingMessage, nil)
			c.mu.Unlock()
			if err != nil {
				if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
					LogError("Unexpected Error Keep Alive:", err)
				} else {
					log.Printf("Keep Alive Proxy Client Closed Reason: %+v\n", err)
					log.Printf("Keep Alive Proxy Client gone - Id: %s\n", c.ID)
				}
				return
			}
		case <-c.ctx.Done():
			log.Printf("Keep Alive Proxy Client cancelled - Id: %s\n", c.ID)
			return
		}
	}
}
