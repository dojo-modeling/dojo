package cmd

import (
	"dojo/common"
	"github.com/spf13/cobra"
	"log"
	"os"
	"path/filepath"
)

const (
	commandType = "tag"
)

var tagCmd = &cobra.Command{
	Args:  cobra.ExactArgs(2),
	Use:   "tag <file> <caption>",
	Short: "Tags an output accessory file such as an image or video",
	Long:  `Tags an output accessory file such as an image or video`,
	Run: func(cmd *cobra.Command, args []string) {
		pattern := args[0]
		caption := args[1]

		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Error %+v", err)
		}

		full_pattern, err := filepath.Abs(filepath.Join(cwd, pattern))
		if err != nil {
			log.Fatalf("Error %+v", err)
		}

		file, err := common.MatchOneFile(pattern)
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("Tagged %s\n", file)
		common.SendCommand(common.COMMAND_TAG, args, map[string]interface{}{"pattern": full_pattern, "file": file, "caption": caption})
	},
}

func init() {
	rootCmd.AddCommand(tagCmd)
}
