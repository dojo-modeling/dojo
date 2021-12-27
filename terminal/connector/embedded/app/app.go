package app

import (
	"flag"
	"github.com/gin-gonic/gin"
	"log"
	"os"
)

var (
	addr          = flag.String("addr", ":6010", "http service address")
	SETTINGS_FILE = flag.String("settings", "settings.yaml", "settings file")
	LOGGER_FLAGS  = log.Ldate | log.Ltime | log.Lshortfile
	LOGGER        = log.New(os.Stderr, "", LOGGER_FLAGS)
)

type BuildInfo struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Build   string `json:"build"`
}

var (
	GlobalBuildInfo = &BuildInfo{}
)

func setup() *gin.Engine {
	settings := NewSettings(*SETTINGS_FILE)
	pool := NewPool()
	go pool.Start()

	historyServer := NewHistorySocketServer(pool, settings)
	go historyServer.Listen()

	engine := SetupRoutes(pool, settings, historyServer)
	return engine
}

func Run() {
	flag.Parse()
	log.SetFlags(LOGGER_FLAGS)
	log.Printf("Listening on %s", *addr)

	router := setup()
	router.Run(*addr)
}
