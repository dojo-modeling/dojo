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

func (r *RedisStore) Del(key string) error {
	_, err := r.rdb.Del(context.Background(), key).Result()
	return err
}

func (r *RedisStore) Scan(pattern string) ([]string, error) {
	xs := make([]string, 0)
	ctx := context.Background()
	iter := r.rdb.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		xs = append(xs, iter.Val())
	}

	if err := iter.Err(); err != nil {
		return xs, err
	}

	return xs, nil
}

func (r *RedisStore) LPush(key string, value string) error {
	_, err := r.rdb.LPush(context.Background(), key, value).Result()
	return err
}

func (r *RedisStore) LRange(key string, start int64, stop int64) ([]string, error) {
	return r.rdb.LRange(context.Background(), key, start, stop).Result()
}

func (r *RedisStore) SAdd(key string, value string) error {
	_, err := r.rdb.SAdd(context.Background(), key, value).Result()
	return err
}

func (r *RedisStore) SMembers(key string) ([]string, error) {
	res, err := r.rdb.SMembers(context.Background(), key).Result()
	return res, err
}

func (r *RedisStore) SRem(key string, val string) error {
	_, err := r.rdb.SRem(context.Background(), key, val).Result()
	return err
}

func (r *RedisStore) Get(key string) (string, error) {
	return r.rdb.Get(context.Background(), key).Result()
}

func (r *RedisStore) HGetAll(key string) (map[string]string, error) {
	return r.rdb.HGetAll(context.Background(), key).Result()
}

func (r *RedisStore) SetNX(key string, val string) (bool, error) {
	return r.rdb.SetNX(context.Background(), key, val, 0).Result()
}

func (r *RedisStore) Set(key string, val string) error {
	return r.rdb.Set(context.Background(), key, val, 0).Err()
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
