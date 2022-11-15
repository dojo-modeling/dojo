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
	CliSockAddr = "/tmp/dojo.sock"
)

type DojoCommand struct {
	Id   string                 `json:"id"`
	Args []string               `json:"args"`
	Cwd  string                 `json:"cwd"`
	Meta map[string]interface{} `json:"meta"`
}

type CliSocketServer struct {
	Pool         *WebSocketPool
	WaitingQueue chan chan uint8
}

func NewCliSocketServer(pool *WebSocketPool) *CliSocketServer {
	return &CliSocketServer{
		Pool:         pool,
		WaitingQueue: make(chan chan uint8, 1),
	}
}

func (server *CliSocketServer) Handle(c net.Conn) {
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
	var dojoCommand DojoCommand
	err = dec.Decode(&dojoCommand)
	if err != nil {
		log.Printf("Decode error:", err)
		return
	}

	bytes, err := json.Marshal(dojoCommand)
	if err != nil {
		log.Printf("Decode error:", err)
		return
	}

	message := WebSocketMessage{Channel: "dojo/command", Payload: string(bytes)}
	server.Pool.Broadcast <- message

}

func (server *CliSocketServer) Listen() {
	if err := os.RemoveAll(CliSockAddr); err != nil {
		log.Fatal(err)
	}

	client, err := net.Listen("unix", CliSockAddr)
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
