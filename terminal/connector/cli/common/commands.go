package common

import (
	"log"
	"os"
)

type CliCommandType int64

const (
	COMMAND_ANNOTATE CliCommandType = iota
	COMMAND_CONFIG
	COMMAND_DOWNLOAD
	COMMAND_EDIT
	COMMAND_TAG
	COMMAND_UPLOAD
)

func (cmd CliCommandType) String() string {
	switch cmd {
	case COMMAND_ANNOTATE:
		return "annotate"
	case COMMAND_CONFIG:
		return "config"
	case COMMAND_DOWNLOAD:
		return "download"
	case COMMAND_EDIT:
		return "edit"
	case COMMAND_TAG:
		return "tag"
	case COMMAND_UPLOAD:
		return "upload"
	}
	return "undefined"
}

type DojoCommand struct {
	Id   string                 `json:"id"`
	Args []string               `json:"args"`
	Cwd  string                 `json:"cwd"`
	Meta map[string]interface{} `json:"meta"`
}

func NewDojoCommand(id CliCommandType, args []string, meta map[string]interface{}) *DojoCommand {
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Error %+v", err)
	}

	return &DojoCommand{
		Id:   id.String(),
		Cwd:  cwd,
		Args: args,
		Meta: meta,
	}
}
