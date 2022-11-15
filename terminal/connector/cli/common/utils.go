package common

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type NoFilesMatchedError struct {
	Pattern string
}

func (e NoFilesMatchedError) Error() string {
	return fmt.Sprintf("Error no files matched %s", e.Pattern)
}

func (e NoFilesMatchedError) Is(target error) bool {
	_, ok := target.(*NoFilesMatchedError)
	return ok
}

type MultipleFilesMatchedError struct {
	Pattern string
	Files   []string
}

func (e MultipleFilesMatchedError) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "Multiple files found matching %s\n", e.Pattern)
	for _, v := range e.Files {
		fmt.Fprintf(&b, " - %s\n", v)
	}
	fmt.Fprintf(&b, "Please specify only 1 file")
	return b.String()
}

func (e MultipleFilesMatchedError) Is(target error) bool {
	_, ok := target.(*MultipleFilesMatchedError)
	return ok
}

func FileForPattern(pattern string) ([]string, error) {
	files := make([]string, 0)

	matches, err := filepath.Glob(pattern)
	if err != nil {
		return files, err
	}

	for _, match := range matches {
		fi, err := os.Stat(match)
		if err != nil {
			return files, err
		}
		switch mode := fi.Mode(); {
		case mode.IsRegular():
			file, err := filepath.Abs(match)
			if err != nil {
				return files, err
			}
			files = append(files, file)
		}
	}

	return files, nil
}

func MatchOneFile(pattern string) (string, error) {

	files, err := FileForPattern(pattern)
	if err != nil {
		return "", err
	}

	if len(files) == 0 {
		return "", &NoFilesMatchedError{Pattern: pattern}
	}

	if len(files) != 1 {
		return "", &MultipleFilesMatchedError{Pattern: pattern, Files: files}
	}

	return files[0], nil
}

func Md5(filepath string) (string, int64, error) {

	file, err := os.Open(filepath)

	if err != nil {
		return "", -1, err
	}
	defer file.Close()

	hash := md5.New()
	l, err := io.Copy(hash, file)

	if err != nil {
		return "", -1, err
	}

	return hex.EncodeToString(hash.Sum(nil)), l, nil
}
