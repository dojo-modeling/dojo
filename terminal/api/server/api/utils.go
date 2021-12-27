package api

import (
	"fmt"
	"log"
	"runtime"
	"time"
)

func LogError(msg string, err error) {
	pc, fn, line, _ := runtime.Caller(1)
	log.Printf("[ERROR] %s, %s[%s:%d] %v\n", msg, runtime.FuncForPC(pc).Name(), fn, line, err)
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
