package api

import (
	"fmt"
	//"github.com/rs/xid"
	"errors"
	"time"
)

const (
	REDIS_PROVISION_LOGS  = "terminal:provision:logs:%s"
	REDIS_PROVISION_LOG   = "terminal:provision:log:%s:%s"
	REDIS_PROVISION_META  = "terminal:provision:meta:%s:%s"
	REDIS_PROVISION_STATE = "terminal:provisioning:state:%s"

	PROVISION_STATE_INITALIZING = "initalizing"
	PROVISION_STATE_PROCESSING  = "processing"
	PROVISION_STATE_READY       = "ready"
	PROVISION_STATE_FAILED      = "failed"
)

type ProvisionStore struct {
	ModelId    string
	Id         string
	logsKey    string
	logKey     string
	logMetaKey string
	stateKey   string
	redis      *RedisStore
}

type ProvisionState struct {
	Id         string `json:"id"`
	ModelId    string `json:"modelId"`
	Host       string `json:"host"`
	State      string `json:"state"`
	Message    string `json:"message"`
	Initalized string `json:"initalized"`
	Updated    string `json:"updated"`
}

type ProvisionLogInfo struct {
	Meta map[string]string `json:"meta"`
	Logs []string          `json:"logs"`
}

func NewProvisionStore(redis *RedisStore, id string, modelId string) *ProvisionStore {

	return &ProvisionStore{
		ModelId:    modelId,
		Id:         id,
		logsKey:    fmt.Sprintf(REDIS_PROVISION_LOGS, modelId),
		logKey:     fmt.Sprintf(REDIS_PROVISION_LOG, modelId, id),
		logMetaKey: fmt.Sprintf(REDIS_PROVISION_META, modelId, id),
		stateKey:   fmt.Sprintf(REDIS_PROVISION_STATE, modelId),
		redis:      redis,
	}
}

func (p *ProvisionStore) InitalizeProvisionStore(host string) error {

	initalized := time.Now().Format(time.RFC3339)

	if err := p.redis.LPush(p.logsKey, p.Id); err != nil {
		return err
	}

	if err := p.redis.HSet(p.logMetaKey, map[string]string{
		"id":         p.Id,
		"modelid":    p.ModelId,
		"initalized": initalized,
		"key":        p.logKey,
		"meta":       p.logMetaKey,
		"host":       host,
	}); err != nil {
		return err
	}

	if err := p.redis.HSet(p.stateKey, map[string]string{
		"id":         p.Id,
		"modelid":    p.ModelId,
		"host":       host,
		"initalized": initalized,
		"updated":    initalized,
		"state":      PROVISION_STATE_INITALIZING,
		"message":    PROVISION_STATE_INITALIZING,
	}); err != nil {
		return err
	}

	return nil
}

func GetProvisionState(redis *RedisStore, modelId string) (ProvisionState, error) {
	//get current state
	stateKey := fmt.Sprintf(REDIS_PROVISION_STATE, modelId)
	state, err := redis.HGetAll(stateKey)

	if err != nil {
		return ProvisionState{}, err
	}

	return ProvisionState{
		Id:         state["id"],
		ModelId:    state["modelid"],
		Host:       state["host"],
		State:      state["state"],
		Message:    state["message"],
		Initalized: state["initalized"],
		Updated:    state["updated"],
	}, nil

}

func GetLastProvisionLogKey(redis *RedisStore, modelId string) (string, error) {

	logsKey := fmt.Sprintf(REDIS_PROVISION_LOGS, modelId)

	logIds, err := redis.LRange(logsKey, 0, 0)
	if err != nil {
		return "", err
	}

	if len(logIds) == 0 {
		return "", errors.New(fmt.Sprintf("No logs found for model", modelId))
	}

	return logIds[0], nil

}

func GetLastProvisionLog(redis *RedisStore, modelId string) (ProvisionLogInfo, error) {
	logId, err := GetLastProvisionLogKey(redis, modelId)
	if err != nil {
		return ProvisionLogInfo{}, err
	}

	logMetaKey := fmt.Sprintf(REDIS_PROVISION_META, modelId, logId)
	meta, err := redis.HGetAll(logMetaKey)
	if err != nil {
		return ProvisionLogInfo{}, err
	}

	logKey := fmt.Sprintf(REDIS_PROVISION_LOG, modelId, logId)
	logs, err := redis.LRange(logKey, 0, -1)
	if err != nil {
		return ProvisionLogInfo{}, err
	}

	return ProvisionLogInfo{
		Meta: meta,
		Logs: logs,
	}, nil
}

func (p *ProvisionStore) UpdateState(state string, message string) error {
	if err := p.redis.LPush(p.logKey, message); err != nil {
		return err
	}
	if err := p.redis.HSet(p.stateKey, map[string]string{
		"state":   state,
		"message": message,
		"updated": time.Now().Format(time.RFC3339),
	}); err != nil {
		return err
	}
	return nil
}

func (p *ProvisionStore) Processing(message string) error {
	return p.UpdateState(PROVISION_STATE_PROCESSING, message)
}

func (p *ProvisionStore) Ready(message string) error {
	return p.UpdateState(PROVISION_STATE_READY, message)
}

func (p *ProvisionStore) Failed(message string) error {
	return p.UpdateState(PROVISION_STATE_FAILED, message)
}
