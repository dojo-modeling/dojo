package common

import (
	"bytes"
	"encoding/gob"
	"log"
	"net"
)

const (
	CliSockAddr = "/tmp/dojo.sock"
)

func SendCommand(id CliCommandType, args []string, meta map[string]interface{}) {
	cmd := NewDojoCommand(id, args, meta)

	c, err := net.Dial("unix", CliSockAddr)
	if err != nil {
		log.Fatalf("Error connecting to socket: %s", err)
	}
	defer c.Close()

	var buff bytes.Buffer
	enc := gob.NewEncoder(&buff)
	err = enc.Encode(cmd)
	if err != nil {
		log.Fatalf("Error encoding: %s", err)
	}

	_, err = c.Write(buff.Bytes())
	if err != nil {
		log.Fatalf("Error writing to socket: %s", err)
	}
}
