package app

import (
	ws "github.com/gorilla/websocket"
	"log"
	"time"
)

type WebSocketPool struct {
	Register   chan *WebSocketClient
	Unregister chan *WebSocketClient
	Clients    map[*WebSocketClient]bool
	Broadcast  chan WebSocketMessage
}

func NewPool() *WebSocketPool {
	return &WebSocketPool{
		Register:   make(chan *WebSocketClient),
		Unregister: make(chan *WebSocketClient),
		Clients:    make(map[*WebSocketClient]bool),
		Broadcast:  make(chan WebSocketMessage),
	}
}

func (pool *WebSocketPool) Start() {
	for {
		select {
		case client := <-pool.Register:
			pool.Clients[client] = true
			log.Printf("New Client Connected ID: %s\n", client.ID)
			log.Printf("Size of Connection Pool: %d\n", len(pool.Clients))
			for client, _ := range pool.Clients {
				log.Printf("Clients Connected: %s\n", client.ID)
			}
			break
		case client := <-pool.Unregister:
			delete(pool.Clients, client)
			log.Printf("Size of Connection Pool: %d\n", len(pool.Clients))
			log.Printf("Client Disonnected ID: %s\n", client.ID)
			for client, _ := range pool.Clients {
				log.Printf("Clients Connected: %s\n", client.ID)
			}
			break
		case message := <-pool.Broadcast:
			log.Printf("Sending message to all clients in Pool\n")
			for client, _ := range pool.Clients {
				client.Conn.SetWriteDeadline(time.Now().Add(writeWait))
				if err := client.Conn.WriteJSON(message); err != nil {
					if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
						log.Printf("Broadcast Error: %+v\n", err)
					}
					return
				}
			}
		}
	}
}
