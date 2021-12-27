package app

import (
	"bytes"
	"encoding/gob"
	"encoding/json"
	"io"
	"log"
	"net"
	"os"
	"strings"
	"time"
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
	Settings     *Settings
	WaitingQueue chan chan uint8
}

func NewHistorySocketServer(pool *WebSocketPool, settings *Settings) *HistorySocketServer {
	return &HistorySocketServer{
		Pool:         pool,
		Settings:     settings,
		WaitingQueue: make(chan chan uint8, 1),
	}
}

func any(vs []string, f func(string) bool) bool {
	for _, v := range vs {
		if f(v) {
			return true
		}
	}
	return false
}

func shouldWait(settings *Settings, s []byte) (wait bool, block bool) {

	if shouldBlock := any(settings.GetRules().Block, func(test string) bool {
		a := strings.ToLower(test)
		return strings.Contains(strings.ToLower(string(s)), a)
	}); shouldBlock {
		return true, true
	}

	if shouldPrompt := any(settings.GetRules().Prompt, func(test string) bool {
		a := strings.ToLower(test)
		return strings.Contains(strings.ToLower(string(s)), a)
	}); shouldPrompt {
		return true, false
	}

	return false, false
}

func (server *HistorySocketServer) ClearBlock(clearOrBlock uint8) {
	for {
		select {
		case ch := <-server.WaitingQueue:
			select {
			case ch <- clearOrBlock:
				log.Printf("sent")
				break
			default:
				log.Printf("channel closed")
			}
		default:
			return
		}
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

	msg := PASS

	wait, block := shouldWait(server.Settings, data)

	if wait {
		if block {
			message := WebSocketMessage{Channel: "term/blocked", Payload: string(bytes)}
			server.Pool.Broadcast <- message
			msg = BLOCK
		} else {
			message := WebSocketMessage{Channel: "term/prompt", Payload: string(bytes)}
			server.Pool.Broadcast <- message
			response := make(chan uint8)
			server.WaitingQueue <- response

			msg = func() uint8 {
				for {
					select {
					case rsp := <-response:
						return rsp
					case <-time.After(time.Second * RESPONSE_TIMEOUT):
						log.Printf("Writing client error: %+v", err)
						return TIMEOUT
					}
				}
			}()
		}
	}

	if msg == PASS {
		message := WebSocketMessage{Channel: "term/message", Payload: string(bytes)}
		server.Pool.Broadcast <- message
	}

	_, err = c.Write([]byte{msg})
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
