package api

import (
	"flag"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

var (
	addr               = flag.String("addr", ":3000", "http service address")
	HTTP_READ_TIMEOUT  = flag.Int("http_read_timeout", 120, "http read timeout")
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

	redisStore := NewRedisStore(settings.Redis.Host, settings.Redis.Port)
	terminalWorkerPool, err := NewTerminalWorkerPool(redisStore)
	if err != nil {
		log.Fatal(err)
	}

	shutdownTimerStore := NewShutdownTimerStore(&settings.AutoShutdownSettings, terminalWorkerPool, pool)

	//Bootstrap Workers
	for _, host := range settings.BootstrapWorkers {
		log.Printf("Bootstrapping worker host: %s", host)
		if err := terminalWorkerPool.AddWorker(host); err != nil {
			LogError(fmt.Sprintf("Error bootstrapping host: %s", host), err)
		}
	}

	//check workers
	if workers, err := terminalWorkerPool.Workers(); err != nil {
		LogError("Error getting workers", err)
	} else {
		if len(workers) == 0 {
			LogWarnMsg("no workers configured")
		} else {
			workerHosts := make([]string, 0)
			for i := range workers {
				workerHosts = append(workerHosts, workers[i].Host)
				go func(w *TerminalWorker) {
					info := w.Info(false)
					log.Printf("Docker Worker - %s, Status: %s\n", w.Host, info.Status)
				}(&workers[i])
			}
			log.Printf("Configured Worker Hosts: [%s]", strings.Join(workerHosts, ","))
		}
	}

	// disabled
	// containerDiffStore := NewContainerDiffStore(docker)
	engine := SetupRoutes(pool, settings, terminalWorkerPool, shutdownTimerStore, redisStore)
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
