package api

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"strings"
)

const DefaultDockerServerPort = "8375"

type DockerServer struct {
	Host string `yaml:host`
	Port string `yaml:port`
}

type DockerSettings struct {
	Hosts []DockerServer
	Auth  string
	Org   string `yaml:"org"`
}

func (d DockerSettings) String() string {
	l := 8
	if l >= len(d.Auth) {
		l = len(d.Auth)
	}
	return fmt.Sprintf("{Org:%s Hosts:%s Auth:%s...}", d.Org, d.Hosts, d.Auth[0:l])
}

type SSHSettings struct {
	User     string `yaml:"user"`
	Password string `yaml:"password"`
}

type RedisSettings struct {
	Host string `yaml:"host"`
	Port string `yaml:"port"`
}

type Settings struct {
	Docker DockerSettings `yaml:"docker"`
	SSH    SSHSettings    `yaml:"ssh"`
	Redis  RedisSettings  `yaml:"redis"`
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

	settings.Docker.Org = GetEnvFatal("DOCKERHUB_ORG")
	settings.Docker.Auth = GetEnvFatal("DOCKERHUB_AUTH")
	terminalWorkerStrings := GetEnvAsSlice("TERMINAL_WORKERS", ",")
	for _, workerString := range terminalWorkerStrings {
		var host, port string
		if strings.Contains(workerString, ":") {
			parts := strings.Split(workerString, ":")
			host = parts[0]
			port = parts[1]
		} else {
			host = workerString
			port = DefaultDockerServerPort
		}
		settings.Docker.Hosts = append(settings.Docker.Hosts, DockerServer{Host: host, Port: port})
	}

	if len(settings.Docker.Hosts) == 0 {
		log.Fatalf("Missing TERMINAL_WORKERS")
	}

	return &settings
}
