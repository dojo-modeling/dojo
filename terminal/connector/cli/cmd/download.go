package cmd

import (
	"dojo/common"
	"github.com/spf13/cobra"
	"log"
)

var downloadCmd = &cobra.Command{
	Args:  cobra.ExactArgs(1),
	Use:   "download <file>",
	Short: "Download a file to your local machine",
	Long:  `Download a file to your local machine`,
	Run: func(cmd *cobra.Command, args []string) {
		file, err := common.MatchOneFile(args[0])
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("Downloading %s\n", file)
		common.SendCommand(common.COMMAND_DOWNLOAD, args, map[string]interface{}{"file": file})
	},
}

func init() {
	rootCmd.AddCommand(downloadCmd)
}
