package api

import (
	"fmt"
)

const (
	REDIS_CONTAINER_KEY        = "closeau:container:%s"
	REDIS_CONTAINER_HISTORY    = "closeau:container:%s:history"
	REDIS_CONTAINER_EDITS      = "closeau:container:%s:edits"
	REDIS_CONTAINER_PROVISIONS = "closeau:container:%s:provisions"
)

type ContainerStore struct {
	Id            string
	editsKey      string
	historyKey    string
	metaKey       string
	provisionsKey string
	redis         *RedisStore
}

func NewContainerStore(redis *RedisStore, id string) *ContainerStore {
	return &ContainerStore{
		redis:         redis,
		Id:            id,
		editsKey:      fmt.Sprintf(REDIS_CONTAINER_EDITS, id),
		historyKey:    fmt.Sprintf(REDIS_CONTAINER_HISTORY, id),
		metaKey:       fmt.Sprintf(REDIS_CONTAINER_KEY, id),
		provisionsKey: fmt.Sprintf(REDIS_CONTAINER_PROVISIONS, id),
	}
}

func (c *ContainerStore) InitalizeContainerStore() error {
	if err := c.redis.HSet(c.metaKey, map[string]string{"id": c.Id}); err != nil {
		return err
	}
	return nil
}

func (c *ContainerStore) AddProvisions(provisions [][]string) error {
	for _, item := range provisions {
		if err := c.redis.AppendListList(c.provisionsKey, item); err != nil {
			return err
		}
	}
	return nil
}

func (c *ContainerStore) AddEdits(edits map[string]string) error {
	return c.redis.AppendListMap(c.editsKey, edits)
}

func (c *ContainerStore) AddHistory(history map[string]string) error {
	return c.redis.AppendListMap(c.historyKey, history)
}

func (c *ContainerStore) AddMeta(meta map[string]string) error {

	return c.redis.HSet(c.metaKey, meta)
}
