package main

import (
	"connector/server/api"
	"fmt"
)

var (
	Version string
	Build   string
	Commit  string
)

func main() {
	api.GlobalBuildInfo.Version = Version
	api.GlobalBuildInfo.Commit = Commit
	api.GlobalBuildInfo.Build = Build
	fmt.Printf("BuildInfo=%+v\n", api.GlobalBuildInfo)
	api.Run()
}
