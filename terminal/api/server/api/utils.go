package api

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"runtime"
	"time"
)

func LogError(msg string, err error) {
	pc, fn, line, _ := runtime.Caller(1)
	log.Printf("[ERROR] %s, %s[%s:%d] %v\n", msg, runtime.FuncForPC(pc).Name(), fn, line, err)
}

//For logging error messages without a thrown error
func LogErrorMsg(msg string) {
	pc, fn, line, _ := runtime.Caller(1)
	log.Printf("[ERROR] %s, %s[%s:%d]\n", msg, runtime.FuncForPC(pc).Name(), fn, line)
}

func LogWarnMsg(msg string) {
	pc, fn, line, _ := runtime.Caller(1)
	log.Printf("[WARNING] %s, %s[%s:%d]\n", msg, runtime.FuncForPC(pc).Name(), fn, line)
}

func LogDuration(msg string, start time.Time) {
	log.Printf("PREF %v: %v\n", msg, time.Since(start))
}

func LogTrace(format string, args ...interface{}) {
	if *TRACE_ENABLED {
		fmt.Printf("[TRACE] "+format+"\n", args...)
	}
}

func IntsContain(s []int, e int) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func StringsContains(s []string, e string) bool {
	for _, a := range s {
		if a == e {
			return true
		}
	}
	return false
}

func DownloadFile(url string, destPath string) error {

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	out, err := os.OpenFile(destPath, os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.FileMode(0755))
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func SafeMarshal(v interface{}) string {
	bytes, err := json.Marshal(v)
	if err != nil {
		LogError("toJSON Marshal error", err)
		return err.Error()
	}
	return string(bytes)
}
