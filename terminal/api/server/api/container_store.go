package api

import (
	"fmt"
)

const (
	REDIS_CONTAINER_KEY     = "terminal:container:%s"
	REDIS_CONTAINER_HISTORY = "terminal:history:%s"
)

type ContainerStore struct {
	Id      string
	metaKey string
	redis   *RedisStore
}

func NewContainerStore(redis *RedisStore, id string, initInfo map[string]string) (*ContainerStore, error) {
	store := &ContainerStore{
		redis:   redis,
		Id:      id,
		metaKey: fmt.Sprintf(REDIS_CONTAINER_KEY, id),
	}

	if err := store.AddMeta(map[string]string{"id": id}); err != nil {
		return &ContainerStore{}, err
	}

	if err := store.AddMeta(initInfo); err != nil {
		return &ContainerStore{}, err
	}

	return store, nil
}

func (c *ContainerStore) AddMeta(meta map[string]string) error {
	return c.redis.HSet(c.metaKey, meta)
}

func ContainerAddHistory(redis *RedisStore, modelId string, history map[string]string) error {
	historyKey := fmt.Sprintf(REDIS_CONTAINER_HISTORY, modelId)
	return redis.AppendListMap(historyKey, history)
}
