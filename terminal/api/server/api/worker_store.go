package api

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	REDIS_WORKERS_KEY                  = "terminal:workers"
	REDIS_WORKER_KEY_PREFIX            = "terminal:worker:"
	REDIS_WORKER_LOCK_PREFIX           = "terminal:lock:"
	REDIS_WORKER_CONTAINER_LOCK_PREFIX = "terminal:container.lock:"
)

var (
	REDIS_WORKER_KEY                = fmt.Sprintf("%s%s", REDIS_WORKER_KEY_PREFIX, "%s")
	REDIS_WORKER_LOCK_KEY           = fmt.Sprintf("%s%s", REDIS_WORKER_LOCK_PREFIX, "%s")
	REDIS_WORKER_CONTAINER_LOCK_KEY = fmt.Sprintf("%s%s", REDIS_WORKER_CONTAINER_LOCK_PREFIX, "%s")
	REDIS_WORKER_LOCK_PATTERN       = fmt.Sprintf("%s%s", REDIS_WORKER_LOCK_PREFIX, "*")
)

type WorkerInfo struct {
	Host      string `json:"host"`
	Birth     string `json:"birth"`
	ModelId   string `json:"modelId"`
	WorkerKey string `json:"-"`
}

type WorkerLock struct {
	LockKey     string `json:"lock"`
	Host        string `json:"host"`
	ModelId     string `json:"modelId"`
	ContainerId string `json:"containerId"`
}

type WorkerStore struct {
	redis *RedisStore `json:"-"`
}

func NewWorkerStore(redis *RedisStore) *WorkerStore {
	return &WorkerStore{
		redis: redis,
	}
}

func (p *WorkerStore) AddWorker(host string) error {
	key := fmt.Sprintf(REDIS_WORKER_KEY, host)
	if err := p.redis.HSet(key, map[string]string{
		"host":  host,
		"birth": time.Now().Format(time.RFC3339),
	}); err != nil {
		return err
	}
	if err := p.redis.SAdd(REDIS_WORKERS_KEY, key); err != nil {
		return err
	}

	return nil
}

func (p *WorkerStore) DeleteWorker(host string) error {
	key := fmt.Sprintf(REDIS_WORKER_KEY, host)
	if err := p.redis.Del(key); err != nil {
		return err
	}
	if err := p.redis.SRem(REDIS_WORKERS_KEY, key); err != nil {
		return err
	}
	return nil
}

func (p *WorkerStore) Workers() ([]WorkerInfo, error) {
	workers := make([]WorkerInfo, 0)
	keys, err := p.redis.SMembers(REDIS_WORKERS_KEY)
	if err != nil {
		return workers, err
	}

	for _, v := range keys {
		worker, err := p.redis.HGetAll(v)
		if err != nil {
			LogError(fmt.Sprintf("Error Populating worker key: %s", v), err)
			continue
		}
		workers = append(workers, WorkerInfo{Host: worker["host"], Birth: worker["birth"], WorkerKey: v})
	}

	return workers, nil
}

func (p *WorkerStore) Locks() ([]WorkerLock, error) {

	locks := make([]WorkerLock, 0)
	lockKeys, err := p.redis.Scan(REDIS_WORKER_LOCK_PATTERN)
	if err != nil {
		LogError("Error retrieving lock keys", err)
		return locks, err
	}

	for _, lockKey := range lockKeys {
		if modelId, err := p.redis.Get(lockKey); err == nil {
			host := strings.Replace(lockKey, REDIS_WORKER_LOCK_PREFIX, "", 1)
			lock := WorkerLock{
				LockKey:     lockKey,
				ModelId:     modelId,
				Host:        host,
				ContainerId: "unset",
			}
			containerKey := fmt.Sprintf(REDIS_WORKER_CONTAINER_LOCK_KEY, modelId)
			if containerId, err := p.redis.Get(containerKey); err == nil {
				lock.ContainerId = containerId
			}
			locks = append(locks, lock)
		} else {
			LogError(fmt.Sprintf("Error retrieving value for lock key: %s", lockKey), err)
		}
	}
	return locks, nil
}

func (p *WorkerStore) Acquire(modelId string) (WorkerLock, error) {
	var locked bool
	var lock WorkerLock
	keys, err := p.redis.SMembers(REDIS_WORKERS_KEY)
	if err != nil {
		LogError("Failed to retieve worker keys", err)
		return lock, err
	}

	for _, key := range keys {
		host := strings.Replace(key, REDIS_WORKER_KEY_PREFIX, "", 1)
		lockKey := fmt.Sprintf(REDIS_WORKER_LOCK_KEY, host)
		if locked, err = p.redis.SetNX(lockKey, modelId); err != nil {
			LogError(fmt.Sprintf("Error attempting to lock %s", lockKey), err)
		} else {
			if locked {
				lock = WorkerLock{
					Host:    strings.Replace(key, REDIS_WORKER_KEY_PREFIX, "", 1),
					ModelId: modelId,
					LockKey: lockKey,
				}
				break
			}
		}
	}

	if !locked {
		return lock, errors.New(fmt.Sprintf("Failed to acquire lock after %d attempts", len(keys)))
	}

	return lock, nil
}

func (p *WorkerStore) Release(modelId string) error {
	locks, err := p.Locks()
	if err != nil {
		return err
	}

	for _, lockInfo := range locks {
		if lockInfo.ModelId == modelId {
			if err := p.redis.Del(lockInfo.LockKey); err != nil {
				return err
			} else {
				containerLockKey := fmt.Sprintf(REDIS_WORKER_CONTAINER_LOCK_KEY, lockInfo.ModelId)
				if err = p.redis.Del(containerLockKey); err != nil {
					LogError("Error removing container id associated with lock", err)
				}
			}
			return nil
		}
	}

	return errors.New(fmt.Sprintf("Failed to find lock for model %s", modelId))
}

func (lock *WorkerLock) AssignContainer(redis *RedisStore, containerId string) error {
	containerLockKey := fmt.Sprintf(REDIS_WORKER_CONTAINER_LOCK_KEY, lock.ModelId)
	if err := redis.Set(containerLockKey, containerId); err != nil {
		return err
	}
	lock.ContainerId = containerId
	return nil
}
