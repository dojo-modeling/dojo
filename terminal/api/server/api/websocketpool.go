package api

import (
	ws "github.com/gorilla/websocket"
	"log"
	"time"
)

const (
	poolTickPeriod = 60 * time.Second
)

type WebSocketPool struct {
	Register   chan *WebSocketClient
	Unregister chan *WebSocketClient
	Clients    map[*WebSocketClient]bool
	Broadcast  chan WebSocketMessage
	Direct     chan DirectMessage
}

func NewPool() *WebSocketPool {
	return &WebSocketPool{
		Register:   make(chan *WebSocketClient),
		Unregister: make(chan *WebSocketClient),
		Clients:    make(map[*WebSocketClient]bool),
		Broadcast:  make(chan WebSocketMessage),
		Direct:     make(chan DirectMessage),
	}
}

func (pool *WebSocketPool) Start() {
	ticker := time.NewTicker(poolTickPeriod)
	for {
		select {
		case <-ticker.C:
			LogTrace("TickSize of Connection Pool: %d", len(pool.Clients))
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
		case directMessage := <-pool.Direct:
			log.Printf("Sending direct message to clients [%v]", directMessage)
			for client, _ := range pool.Clients {
				if StringsContains(directMessage.Clients, client.ID) {
					log.Printf("Sending direct message to client %s", client.ID)
					client.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
					if err := client.Conn.WriteJSON(directMessage.Message); err != nil {
						if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
							log.Printf("Broadcast Error: %+v\n", err)
						}
						return
					}
				}
			}
		case message := <-pool.Broadcast:
			log.Printf("Sending message to all clients in Pool\n")
			for client, _ := range pool.Clients {
				client.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
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
