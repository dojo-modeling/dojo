package main

import "dojo/cmd"

var (
	Version string
	Build   string
	Commit  string
)

func main() {
	cmd.GlobalBuildInfo.Version = Version
	cmd.GlobalBuildInfo.Commit = Commit
	cmd.GlobalBuildInfo.Build = Build
	cmd.Run()
}
