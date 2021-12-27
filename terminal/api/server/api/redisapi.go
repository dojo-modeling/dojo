package api

import (
	"context"
	"fmt"
	"github.com/go-redis/redis/v8"
	"log"
	"sync"
)

type RedisStore struct {
	mu  sync.RWMutex
	rdb *redis.Client
}

func NewRedisStore(redis_host string, redis_port string) *RedisStore {
	addr := fmt.Sprintf("%s:%s", redis_host, redis_port)
	log.Printf("Connecting to Redis %s", addr)
	rdb := redis.NewClient(&redis.Options{
		Addr: addr,
	})

	return &RedisStore{
		rdb: rdb,
	}
}

func (r *RedisStore) Ping() error {
	_, err := r.rdb.Ping(context.Background()).Result()
	return err
}

func (r *RedisStore) HSet(key string, m map[string]string) error {
	_, err := r.rdb.HSet(context.Background(), key, m).Result()
	return err
}

func (r *RedisStore) RPush(key string, l []string) error {
	_, err := r.rdb.RPush(context.Background(), key, l).Result()
	return err
}

func (r *RedisStore) AppendListMap(prefix string, m map[string]string) error {
	len, err := r.rdb.Incr(context.Background(), fmt.Sprintf("%s:idx", prefix)).Result()
	if err != nil {
		return err
	}
	idx := len - 1
	key := fmt.Sprintf("%s:%d", prefix, idx)
	return r.HSet(key, m)
}

func (r *RedisStore) AppendListList(prefix string, l []string) error {
	len, err := r.rdb.Incr(context.Background(), fmt.Sprintf("%s:idx", prefix)).Result()
	if err != nil {
		return err
	}
	idx := len - 1
	key := fmt.Sprintf("%s:%d", prefix, idx)
	return r.RPush(key, l)
}
