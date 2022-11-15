package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
	"log"
)

type BuildInfo struct {
	Version string `json:"version"`
	Commit  string `json:"commit"`
	Build   string `json:"build"`
}

func (b BuildInfo) String() string {
	return fmt.Sprintf("Version: %s\nBuild: %s\nCommit: %s\n", b.Version, b.Build, b.Commit)
}

var (
	GlobalBuildInfo = &BuildInfo{}
)

func Run() {
	log.SetFlags(0)
	cobra.CheckErr(rootCmd.Execute())
}
