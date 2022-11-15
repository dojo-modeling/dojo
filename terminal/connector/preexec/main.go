package main

import (
	"bytes"
	"encoding/gob"
	"flag"
	"fmt"
	"net"
	"os"
	"strings"
)

const (
	SOCK_ADDR       = "/tmp/history.sock"
	PASS      uint8 = 0
	BLOCK     uint8 = 1
	ERROR     uint8 = 8
	TIMEOUT   uint8 = 42
)

var dir = flag.String("dir", "/home/clouseau", "working directory")

type CommandLine struct {
	Command string
	Cwd     string
}

func reader(c net.Conn, out chan uint8) {
	buf := make([]byte, 1)
	_, err := c.Read(buf)
	if err != nil {
		out <- ERROR
	}

	data := buf[0]
	if err != nil {
		out <- ERROR
	}
	out <- uint8(data)
}

func sendMessage(c net.Conn, message []byte) {
	var buff bytes.Buffer
	enc := gob.NewEncoder(&buff)
	err := enc.Encode(CommandLine{Command: string(message), Cwd: *dir})
	if err != nil {
		fmt.Printf("Encode error:", err)
	}

	_, err = c.Write(buff.Bytes())
	if err != nil {
		fmt.Printf("Write error: %s", err)
	}
}

func main() {
	exitCode := 0
	defer func() { os.Exit(exitCode) }()

	flag.Parse()
	commandline := strings.Join(flag.Args(), " ")
	c, err := net.Dial("unix", SOCK_ADDR)
	defer c.Close()

	if err != nil {
		fmt.Printf("Failed to dial: %s", err)
	}
	sendMessage(c, []byte(commandline))
	out := make(chan uint8)
	go reader(c, out)
	msg := func() uint8 {
		for {
			select {
			case msg := <-out:
				return msg
			}
		}
	}()

	exitCode = int(msg)
}
