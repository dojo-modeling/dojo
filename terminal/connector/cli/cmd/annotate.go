package cmd

import (
	"dojo/common"
	"errors"
	"github.com/spf13/cobra"
	"log"
	"os"
	"path/filepath"
)

var annotateForce bool

var annotateCmd = &cobra.Command{
	Args:  cobra.ExactArgs(1),
	Use:   "annotate <file>",
	Short: "tags an output file and opens the web output file annotation tool",
	Long:  `tags an output file and opens the web output file annotation tool`,
	Run: func(cmd *cobra.Command, args []string) {

		var files []string
		pattern := args[0]

		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Error %+v", err)
		}

		full_pattern, err := filepath.Abs(filepath.Join(cwd, pattern))

		if err != nil {
			log.Fatalf("Error %+v", err)
		}

		file, err := common.MatchOneFile(pattern)

		var NoFilesMatched *common.NoFilesMatchedError
		var MultipleFilesMatched *common.MultipleFilesMatchedError

		if err == nil {
			files = append(files, file)
		} else {
			if errors.Is(err, NoFilesMatched) {
				log.Printf(err.Error())
			} else if errors.Is(err, MultipleFilesMatched) {
				if annotateForce {
					files = err.(*common.MultipleFilesMatchedError).Files
				} else {
					log.Printf(err.Error())
					log.Fatalf("\nUse -f to force this pattern even though multiple files exist")
				}
			} else {
				log.Fatal(err)
			}
		}

		common.SendCommand(common.COMMAND_ANNOTATE, args, map[string]interface{}{"pattern": full_pattern, "files": files})
	},
}

func init() {
	rootCmd.AddCommand(annotateCmd)
	annotateCmd.Flags().BoolVarP(&annotateForce, "force", "f", false, "ignore 0 or many files matching file pattern")
}
