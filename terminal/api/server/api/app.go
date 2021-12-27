package api

import (
	"flag"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
	"time"
)

var (
	addr               = flag.String("addr", ":3000", "http service address")
	HTTP_READ_TIMEOUT  = flag.Int("http_read_timeout", 15, "http read timeout")
	HTTP_WRITE_TIMEOUT = flag.Int("http_write_timeout", 60, "http write timeout")
	LOAD_ENV           = flag.Bool("env", false, "load .env file")
	SETTINGS_FILE      = flag.String("settings", "settings.yaml", "settings file")
	DEBUG_ENABLED      = flag.Bool("debug", false, "enable debug")
	TRACE_ENABLED      = flag.Bool("trace", false, "enable tracing")
	PULL_IMAGES        = flag.Bool("pull-images", true, "disable - pull docker images before launch")
	LOGGER_FLAGS       = log.Ldate | log.Ltime | log.Lshortfile
	LOGGER             = log.New(os.Stderr, "", LOGGER_FLAGS)
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
	log.Printf("Settings: %+v\n", settings)
	pool := NewPool()
	go pool.Start()

	terminalWorkerPool, err := NewTerminalWorkerPool(settings)
	if err != nil {
		log.Fatal(err)
	}
	redisStore := NewRedisStore(settings.Redis.Host, settings.Redis.Port)
	// disabled
	// containerDiffStore := NewContainerDiffStore(docker)
	engine := SetupRoutes(pool, settings, terminalWorkerPool, redisStore)
	return engine
}

func Run() {
	flag.Parse()
	log.SetFlags(LOGGER_FLAGS)

	if *LOAD_ENV {
		err := godotenv.Load()
		if err != nil {
			log.Fatalf("Error loading .env file %+v", err)
		}
	}

	log.Printf("Listening on %s", *addr)
	router := setup()

	s := &http.Server{
		Addr:           *addr,
		Handler:        router,
		ReadTimeout:    time.Duration(*HTTP_READ_TIMEOUT) * time.Second,
		WriteTimeout:   time.Duration(*HTTP_WRITE_TIMEOUT) * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	s.SetKeepAlivesEnabled(false)
	log.Fatal(s.ListenAndServe())
	//router.Run(*addr)
}
