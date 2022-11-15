package cmd

import (
	"fmt"
	"github.com/spf13/cobra"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print Version",
	Long:  "Print Version",
	Run: func(cmd *cobra.Command, args []string) {
		if Verbose {
			fmt.Println(GlobalBuildInfo)
		} else {
			fmt.Println(GlobalBuildInfo.Version)
		}
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}
