package api

import (
	//"fmt"
	//"github.com/gin-gonic/gin"
	ws "github.com/gorilla/websocket"
	//"github.com/rs/xid"
	"log"
	"net/http"
	//"strconv"
	"time"
)

const (
	// Time allowed to write the file to the client.
	WRITE_WAIT_DEADLINE = 15 * time.Second

	// Time allowed to read the next pong message from the client.
	PONG_WAIT = 30 * time.Second

	// Send pings to client with this period. Must be less than PONG_WAIT.
	PING_PERIOD = (PONG_WAIT * 8) / 10
)

type WebSocketMessage struct {
	Channel string `json:"channel"`
	Payload string `json:"payload"`
}

var webSocketUpgrader = ws.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func WebSocketUpgrade(w http.ResponseWriter, r *http.Request) (*ws.Conn, error) {
	webSocketUpgrader.CheckOrigin = func(r *http.Request) bool {
		return true
	}
	conn, err := webSocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return nil, err
	}

	return conn, nil
}
