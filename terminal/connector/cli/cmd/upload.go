package cmd

import (
	"dojo/common"
	"github.com/spf13/cobra"
	"log"
	"os"
)

var uploadCmd = &cobra.Command{
	Use:   "upload",
	Short: "Upload files from your local machine to the current container",
	Long:  "Upload files from your local machine to the current container",
	Run: func(cmd *cobra.Command, args []string) {
		log.Printf("Uploading started")
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Error %+v", err)
		}
		common.SendCommand(common.COMMAND_UPLOAD, []string{}, map[string]interface{}{"cwd": cwd, "error": err})
	},
}

func init() {
	rootCmd.AddCommand(uploadCmd)
}
