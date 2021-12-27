package app

import (
	ws "github.com/gorilla/websocket"
	"log"
	"sync"
	"time"
)

type WebSocketClient struct {
	ID          string
	ContainerID string
	Conn        *ws.Conn
	Pool        *WebSocketPool
	mu          sync.Mutex
}

type WebSocketMessage struct {
	Channel string `json:"channel"`
	Payload string `json:"payload"`
}

func (c *WebSocketClient) Read() {
	defer func() {
		c.Pool.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	c.Pool.Broadcast <- WebSocketMessage{Channel: "client/containerID", Payload: c.ContainerID}

	for {
		_, payload, err := c.Conn.ReadMessage()

		if err != nil {
			if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
				log.Printf("error: %+v\n", err)
			}
			return
		}

		message := WebSocketMessage{Channel: "client/message", Payload: string(payload)}
		c.Pool.Broadcast <- message
		log.Printf("Message Received: %+v\n", message)
	}
}

func (c *WebSocketClient) KeepAlive() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			log.Printf("Send Keep Alive Id: %s\n", c.ID)
			if err := c.Conn.WriteMessage(ws.PingMessage, nil); err != nil {
				if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
					log.Printf("Unexpected Error Keep Alive: %+v\n", err)
				} else {
					log.Printf("Keep Alive Client gone - Id: %s\n", c.ID)
				}
				return
			}
		}
	}
}
