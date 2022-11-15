package api

import (
	"context"
	"encoding/json"
	"log"
	"math"
	"sync"
	"time"
)

const ()

type ShutdownHeartbeatMessage struct {
	Seconds float64 `json:"seconds"`
}

type ShutdownTimer struct {
	shutdownSettings *AutoShutdownSettings
	warning          *time.Timer
	shutdown         *time.Timer
	//heartbeat *time.Ticker
	end           time.Time
	websocketPool *WebSocketPool
	lock          *WorkerLock
	ctx           *context.Context
	cancelCtx     *context.CancelFunc
}

type ShutdownTimerStore struct {
	Timers             map[string]*ShutdownTimer
	terminalWorkerPool *TerminalWorkerPool
	websocketPool      *WebSocketPool
	shutdownSettings   *AutoShutdownSettings
	mu                 sync.RWMutex
}

func NewShutdownTimerStore(settings *AutoShutdownSettings, terminalWorkerPool *TerminalWorkerPool, websocketPool *WebSocketPool) *ShutdownTimerStore {
	return &ShutdownTimerStore{
		Timers:             map[string]*ShutdownTimer{},
		terminalWorkerPool: terminalWorkerPool,
		websocketPool:      websocketPool,
		shutdownSettings:   settings,
	}
}

func (s *ShutdownTimer) heartbeatFunc() {
	heartbeat := time.NewTicker(s.shutdownSettings.AutoShutdownHeartbeat)
	log.Printf("Heartbeat started for %s", s.lock.ModelId)
	for {
		select {
		case <-heartbeat.C:
			t := s.TimeRemaining().Seconds()
			if t > 0 {
				msg := ShutdownHeartbeatMessage{
					Seconds: math.Floor(t),
				}

				bytes, err := json.Marshal(msg)
				if err != nil {
					LogError("Heartbeat marshal error", err)
					continue
				}

				s.websocketPool.Model <- ModelMessage{
					ModelId: s.lock.ModelId,
					Message: WebSocketMessage{
						Channel: "term/heartbeat",
						Payload: string(bytes),
					},
				}
			} else {
				log.Printf("Heartbeat expired for %s", s.lock.ModelId)
				heartbeat.Stop()
				return
			}
		case <-(*s.ctx).Done():
			log.Printf("Heartbeat canceled for %s", s.lock.ModelId)
			heartbeat.Stop()
			return
		}
	}
}

func (s *ShutdownTimer) Stop() {
	s.shutdown.Stop()
	s.warning.Stop()
	(*s.cancelCtx)()
	s.end = time.Time{}
}

func (s *ShutdownTimer) Reset() {
	s.shutdown.Stop()
	s.warning.Stop()
	(*s.cancelCtx)()
	s.end = time.Now().Add(s.shutdownSettings.AutoShutdownTime)
	s.warning.Reset(s.shutdownSettings.AutoShutdownWarning)
	s.shutdown.Reset(s.shutdownSettings.AutoShutdownTime)
	ctx, cancel := context.WithCancel(context.Background())
	s.ctx = &ctx
	s.cancelCtx = &cancel
	go s.heartbeatFunc()
	log.Printf("Heartbeat Reset for %s", s.lock.ModelId)
}

func (s *ShutdownTimer) TimeRemaining() time.Duration {
	return s.end.Sub(time.Now())
}

func NewShutdownTimer(shutdownSettings *AutoShutdownSettings, terminalWorkerPool *TerminalWorkerPool, pool *WebSocketPool, lock *WorkerLock, worker *TerminalWorker, remove func()) *ShutdownTimer {

	ctx, cancel := context.WithCancel(context.Background())

	end := time.Now().Add(shutdownSettings.AutoShutdownTime)
	//heartbeat := time.NewTicker(HEARTBEAT_TIMER)

	warningTimer := time.AfterFunc(shutdownSettings.AutoShutdownWarning, func() {
		log.Printf("Warning timer triggered for - model %s, container %s\n", lock.ContainerId, lock.ModelId)

		pool.Model <- ModelMessage{
			ModelId: lock.ModelId,
			Message: WebSocketMessage{
				Channel: "term/warning",
				Payload: "Terminal will shutdown in less than 60 seconds",
			},
		}
	})

	shutdownTimer := time.AfterFunc(shutdownSettings.AutoShutdownTime, func() {

		log.Printf("Auto Shutdown triggered for model %s, container %s\n", lock.ContainerId, lock.ModelId)

		pool.Model <- ModelMessage{
			ModelId: lock.ModelId,
			Message: WebSocketMessage{
				Channel: "term/shutdown",
				Payload: "Terminal shutdown initiated",
			},
		}

		err := worker.Docker.Stop(lock.ContainerId)
		if err != nil {
			LogError("Error stopping container during auto-shutdown", err)
			return
		}

		if err := terminalWorkerPool.Release(lock.ModelId); err != nil {
			LogError("Error releasing for lock for unsuccessful worker ", err)
			return
		}

		log.Printf("Auto Shutdown Remove Timer - model %s, container %s\n", lock.ContainerId, lock.ModelId)
		remove()
		log.Printf("Auto Shutdown Complete - model %s, container %s\n", lock.ContainerId, lock.ModelId)
	})

	timer := ShutdownTimer{
		shutdownSettings: shutdownSettings,
		warning:          warningTimer,
		shutdown:         shutdownTimer,
		//heartbeat: heartbeat,
		end:           end,
		lock:          lock,
		websocketPool: pool,
		ctx:           &ctx,
		cancelCtx:     &cancel,
	}
	go timer.heartbeatFunc()

	return &timer
}

func (s *ShutdownTimerStore) CreateResetTimer(lock *WorkerLock, worker *TerminalWorker) {

	t, exist := s.Timers[lock.ModelId]
	if exist {
		//handle duplicates reset?
		t.Stop()
	}

	removeTimer := func() {
		s.DestroyTimer(lock)
	}
	s.mu.Lock()
	s.Timers[lock.ModelId] = NewShutdownTimer(s.shutdownSettings, s.terminalWorkerPool, s.websocketPool, lock, worker, removeTimer)
	s.mu.Unlock()
}

func (s *ShutdownTimerStore) TimeRemaining(lock *WorkerLock) (time.Duration, bool) {
	t, exist := s.Timers[lock.ModelId]
	if !exist {
		return time.Duration(-1), false
	}
	return (*t).TimeRemaining(), true
}

func (s *ShutdownTimerStore) ExtendTimer(lock *WorkerLock) (time.Duration, bool) {
	t, exist := s.Timers[lock.ModelId]
	if !exist {
		return time.Duration(-1), false
	}
	(*t).Reset()
	return (*t).TimeRemaining(), true
}

func (s *ShutdownTimerStore) DestroyTimer(lock *WorkerLock) bool {
	t, exist := s.Timers[lock.ModelId]
	if !exist {
		return false
	}

	(*t).Stop()
	s.mu.Lock()
	delete(s.Timers, lock.ModelId)
	s.mu.Unlock()
	return true
}
