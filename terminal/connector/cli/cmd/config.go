package cmd

import (
	"dojo/common"
	"fmt"
	"github.com/spf13/cobra"
	"log"
)

var configCmd = &cobra.Command{
	Args:  cobra.ExactArgs(1),
	Use:   "config <file>",
	Short: "Opens the web configuration file annotation tool",
	Long:  `Opens the web configuration file annotation tool`,
	Run: func(cmd *cobra.Command, args []string) {
		file, err := common.MatchOneFile(args[0])
		if err != nil {
			log.Fatal(err)
		}

		hash, bytes, err := common.Md5(file)
		if err != nil {
			log.Fatalf("Md5 Error %+v", err)
		}

		log.Printf("Opening config for %s\n", file)
		common.SendCommand(common.COMMAND_CONFIG, args, map[string]interface{}{"file": file, "md5": hash, "bytes": fmt.Sprintf("%d", bytes)})
	},
}

func init() {
	rootCmd.AddCommand(configCmd)
}
