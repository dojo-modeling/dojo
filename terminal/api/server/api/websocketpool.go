package api

import (
	"log"
	"strings"
	"time"

	ws "github.com/gorilla/websocket"
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
	Model      chan ModelMessage
}

type DirectMessage struct {
	Message WebSocketMessage `json:"message"`
	Clients []string         `json:"clients"`
}

type ModelMessage struct {
	Message WebSocketMessage `json:"message"`
	ModelId string           `json:"modelId"`
}

func NewPool() *WebSocketPool {
	return &WebSocketPool{
		Register:   make(chan *WebSocketClient),
		Unregister: make(chan *WebSocketClient),
		Clients:    make(map[*WebSocketClient]bool),
		Broadcast:  make(chan WebSocketMessage),
		Direct:     make(chan DirectMessage),
		Model:      make(chan ModelMessage),
	}
}

func (pool *WebSocketPool) Start() {
	ticker := time.NewTicker(poolTickPeriod)
	for {
		select {
		case <-ticker.C:
			if *TRACE_ENABLED {
				clients := make([]string, 0, len(pool.Clients))
				for c := range pool.Clients {
					clients = append(clients, c.String())
				}
				LogTrace("TickSize of Connection Pool: %d", len(pool.Clients))
				LogTrace("Clients: [%s]", strings.Join(clients, ","))
			}
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
		case modelMessage := <-pool.Model:
			log.Printf("Sending model message to clients [%v]", modelMessage)
			for client, _ := range pool.Clients {
				if client.ModelId == modelMessage.ModelId {
					log.Printf("Sending model message to client %s, modelId %s", client.ID, modelMessage.ModelId)
					client.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
					client.mu.Lock()
					err := client.Conn.WriteJSON(modelMessage.Message)
					client.mu.Unlock()
					if err != nil {
						if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
							log.Printf("Model Message Error: %+v\n", err)
						}
						return
					}
				}
			}
		case directMessage := <-pool.Direct:
			log.Printf("Sending direct message to clients [%v]", directMessage)
			for client, _ := range pool.Clients {
				if client.ID == "sniff" || StringsContains(directMessage.Clients, client.ID) {
					log.Printf("Sending direct message to client %s", client.ID)
					client.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
					client.mu.Lock()
					err := client.Conn.WriteJSON(directMessage.Message)
					client.mu.Unlock()
					if err != nil {
						if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
							log.Printf("Direct Message Error: %+v\n", err)
						}
						return
					}
				}
			}
		case message := <-pool.Broadcast:
			log.Printf("Sending message to all clients in Pool\n")
			for client, _ := range pool.Clients {
				client.Conn.SetWriteDeadline(time.Now().Add(WRITE_WAIT_DEADLINE))
				client.mu.Lock()
				err := client.Conn.WriteJSON(message)
				client.mu.Unlock()
				if err != nil {
					if ws.IsUnexpectedCloseError(err, ws.CloseGoingAway, ws.CloseAbnormalClosure) {
						log.Printf("Broadcast Error: %+v\n", err)
					}
					return
				}
			}
		}
	}
}

func (pool *WebSocketPool) DirectMessage(listeners []string, channel string, payload string) {
	pool.Direct <- DirectMessage{
		Clients: listeners,
		Message: WebSocketMessage{Channel: channel, Payload: payload},
	}
}
