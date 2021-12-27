package api

import (
	"bufio"
	"context"
	"golang.org/x/crypto/ssh"
	"io"
	"log"
)

type Terminal struct {
	Height int `json:"rows"`
	Width  int `json:"cols"`
}

type SSHD struct {
	Server    string
	User      string
	Password  string
	In        chan WebSocketMessage
	Out       func(WebSocketMessage)
	Close     chan bool
	Open      bool
	Terminal  *Terminal
	parentCtx context.Context
}

func NewSSHD(parentCtx context.Context, server string, user string, password string, out func(WebSocketMessage)) *SSHD {
	return &SSHD{
		Server:   server,
		User:     user,
		Password: password,
		In:       nil,
		Out:      out,
		Close:    make(chan bool),
		Open:     false,
		Terminal: &Terminal{
			Height: 40,
			Width:  120,
		},
		parentCtx: parentCtx,
	}
}

func (sshd *SSHD) Stop() {
	if sshd.Open {
		sshd.Close <- true
	}
	sshd.Open = false
	log.Printf("SSH Stopped %v ", sshd.Server)
}

func (sshd *SSHD) Start() {
	if sshd.Open {
		log.Printf("SSH Already Connected\n")
		return
	}
	sshd.In = make(chan WebSocketMessage)
	sshd.Open = true

	defer func() {
		log.Printf("SSH defer Stopped %v ", sshd.Server)
		close(sshd.In)
		sshd.Stop()
	}()

	config := &ssh.ClientConfig{
		User: sshd.User,
		Auth: []ssh.AuthMethod{
			ssh.Password(sshd.Password),
		},
	}

	config.HostKeyCallback = ssh.InsecureIgnoreHostKey()

	log.Printf("SSH Connect: %v -  %+v\n", sshd.Server, config)
	conn, err := ssh.Dial("tcp", sshd.Server, config)
	if err != nil {
		LogError("Failed to dial: ", err)
		return
	}
	defer conn.Close()

	session, err := conn.NewSession()
	if err != nil {
		LogError("Failed to create session", err)
		return
	}
	defer session.Close()

	in, _ := session.StdinPipe()
	o, _ := session.StdoutPipe()
	e, _ := session.StdoutPipe()

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,     // enable echoing
		ssh.TTY_OP_ISPEED: 14400, // input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // output speed = 14.4kbaud
	}

	//if err := session.RequestPty("xterm", 80, 40, modes); err != nil {

	// h = rows, w = cols
	LogTrace("Terminal Size: %+v", sshd.Terminal)
	if err := session.RequestPty("xterm-256color", sshd.Terminal.Height, sshd.Terminal.Width, modes); err != nil {
		//if err := session.RequestPty("vt100", 80, 40, modes); err != nil {
		//if err := session.RequestPty("vt220", 80, 40, modes); err != nil {
		LogError("request for pseudo terminal failed", err)
		return
	}

	if err := session.Shell(); err != nil {
		LogError("failed to start shell", err)
		return
	}

	outbuf := bufio.NewReader(o)
	errbuf := bufio.NewReader(e)

	go func() {
		sshd.Out(WebSocketMessage{Channel: "ssh/connected", Payload: "connected"})
		for {
			ob := make([]byte, 1024)
			n, err := outbuf.Read(ob)
			if err != nil {
				if err != io.EOF {
					LogError("stdout read buff failed", err)
				}
				return
			}
			LogTrace("sending stdout %v", ob[0:n])
			sshd.Out(WebSocketMessage{Channel: "xterm", Payload: string(ob[0:n])})
		}
	}()

	go func() {
		for {
			eb := make([]byte, 1024)
			n, err := errbuf.Read(eb)
			if err != nil {
				if err != io.EOF {
					LogError("stderr read buff failed", err)
				}
				return
			}
			LogTrace("sending stderr %v", eb[0:n])
			//std err
			sshd.Out(WebSocketMessage{Channel: "xterm", Payload: string(eb[0:n])})
		}
	}()

	for {
		select {
		case w := <-sshd.In:
			LogTrace("write %+v", []byte(w.Payload))
			in.Write([]byte(w.Payload))
		case <-sshd.Close:
			return
		}
	}
}
