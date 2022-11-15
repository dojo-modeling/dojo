package app

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"io"
	"log"
	"net"
	"os"
)

const (
	SockAddr               = "/tmp/history.sock"
	PASS             uint8 = 0
	BLOCK            uint8 = 1
	ERROR            uint8 = 8
	TIMEOUT          uint8 = 42
	RESPONSE_TIMEOUT       = 60
)

type CommandLine struct {
	Command string `json:"command"`
	Cwd     string `json:"cwd"`
}

type HistorySocketServer struct {
	Pool         *WebSocketPool
	WaitingQueue chan chan uint8
}

func NewHistorySocketServer(pool *WebSocketPool) *HistorySocketServer {
	return &HistorySocketServer{
		Pool:         pool,
		WaitingQueue: make(chan chan uint8, 1),
	}
}

func (server *HistorySocketServer) Handle(c net.Conn) {
	log.Printf("Client connected [%s]", c.RemoteAddr().Network())
	defer c.Close()

	buf := make([]byte, 2056)
	count, err := c.Read(buf)
	if err != nil {
		if err != io.EOF {
			log.Printf("Error on Read: %+v", err)
		}
		return
	}
	data := buf[0:count]

	buff := bytes.NewBuffer(data)
	dec := gob.NewDecoder(buff)
	var commandline CommandLine
	err = dec.Decode(&commandline)
	if err != nil {
		log.Printf("Decode error:", err)
		return
	}

	bytes, err := json.Marshal(commandline)
	if err != nil {
		log.Printf("Decode error:", err)
		return
	}

	message := WebSocketMessage{Channel: "term/message", Payload: string(bytes)}
	server.Pool.Broadcast <- message

	_, err = c.Write([]byte{PASS})
	if err != nil {
		log.Printf("Writing client error: %+v", err)
	}
}

func (server *HistorySocketServer) Listen() {
	if err := os.RemoveAll(SockAddr); err != nil {
		log.Fatal(err)
	}

	client, err := net.Listen("unix", SockAddr)
	if err != nil {
		log.Fatal("listen error:", err)
	}
	defer client.Close()

	for {
		conn, err := client.Accept()
		if err != nil {
			log.Fatal("accept error:", err)
		}
		go server.Handle(conn)
	}
}
