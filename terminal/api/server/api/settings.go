package api

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type AutoShutdownSettings struct {
	AutoShutdownTime      time.Duration
	AutoShutdownWarning   time.Duration
	AutoShutdownHeartbeat time.Duration
}

type DockerSettings struct {
	Auth string
	Org  string `yaml:"org"`
}

func (d DockerSettings) String() string {
	l := 8
	if l >= len(d.Auth) {
		l = len(d.Auth)
	}
	return fmt.Sprintf("{Org:%s Auth:%s...}", d.Org, d.Auth[0:l])
}

type SSHSettings struct {
	User     string `yaml:"user"`
	Password string `yaml:"password"`
}

type RedisSettings struct {
	Host string `yaml:"host"`
	Port string `yaml:"port"`
}

type HttpSettings struct {
	Static string `yaml:"static"`
}

type Settings struct {
	Docker               DockerSettings `yaml:"docker"`
	SSH                  SSHSettings    `yaml:"ssh"`
	Redis                RedisSettings  `yaml:"redis"`
	Http                 HttpSettings   `yaml:"http"`
	AutoShutdownSettings AutoShutdownSettings
	BootstrapWorkers     []string
}

func GetEnvFatal(key string) string {
	v := os.Getenv(key)

	if v == "" {
		log.Fatalf("Missing Env Configuration: %s", key)
	}
	return v
}

func SetEnvOptional(set *string, key string) {
	v := os.Getenv(key)
	if v == "" {
		log.Printf("No Env override for key: %s", key)
	} else {
		*set = v
	}
}

func SetEnvOptionalDuration(set *time.Duration, key string, duration time.Duration, defaultDuration time.Duration) {
	v := os.Getenv(key)
	if v == "" {
		log.Printf("No Env override for key: %s, using default duration", key)
		*set = defaultDuration
	} else {
		if intVar, err := strconv.Atoi(v); err != nil {
			log.Printf("Error converting string to int: %s, using default duration", v, key)
			*set = defaultDuration
		} else {
			*set = time.Duration(intVar) * duration
		}
	}
}

func GetEnvAsSlice(name string, sep string) []string {
	valStr := GetEnvFatal(name)
	val := strings.Split(valStr, sep)
	return val
}

func NewSettings(fp string) *Settings {

	settings := Settings{}
	filename, _ := filepath.Abs(fp)
	yamlFile, err := ioutil.ReadFile(filename)
	if err != nil {
		log.Fatalf("error loading yaml: %v", err)
		return &settings
	}

	err = yaml.Unmarshal(yamlFile, &settings)
	if err != nil {
		log.Fatalf("error unmarshal yaml: %v", err)
		return &settings
	}

	SetEnvOptional(&settings.Redis.Host, "REDIS_HOST")
	SetEnvOptional(&settings.Redis.Port, "REDIS_PORT")
	SetEnvOptional(&settings.Docker.Org, "DOCKERHUB_ORG")
	SetEnvOptional(&settings.Http.Static, "HTTP_STATIC")

	SetEnvOptionalDuration(&settings.AutoShutdownSettings.AutoShutdownTime, "AUTO_SHUTDOWN_TIME", time.Minute, 15*time.Minute)
	SetEnvOptionalDuration(&settings.AutoShutdownSettings.AutoShutdownWarning, "AUTO_SHUTDOWN_WARNING_TIME", time.Minute, settings.AutoShutdownSettings.AutoShutdownTime-(1*time.Minute))
	SetEnvOptionalDuration(&settings.AutoShutdownSettings.AutoShutdownHeartbeat, "AUTO_SHUTDOWN_HEARTBEAT", time.Second, 5*time.Second)

	if settings.Docker.Org == "" {
		log.Printf("No settings for Docker.Org were found, using default = jataware")
		settings.Docker.Org = "jataware"
	}

	if settings.Http.Static == "" {
		log.Fatal("Missing http static dir")
	}

	settings.Docker.Auth = GetEnvFatal("DOCKERHUB_AUTH")
	settings.BootstrapWorkers = GetEnvAsSlice("TERMINAL_WORKERS", ",")

	return &settings
}
