package api

import (
	"context"
	"errors"
	"fmt"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/pkg/archive"
	"log"
	"os"
	"path/filepath"
	"sync"
	"text/template"
	"time"
)

type TerminalWorker struct {
	Host   string  `json:"host"`
	Birth  string  `json:"birth"`
	Docker *Docker `json:"-"`
}

const (
	WORKER_STATUS_UP   = "up"
	WORKER_STATUS_DOWN = "down"
)

type TerminalWorkerInfo struct {
	Status string
	Info   interface{}
}

type TerminalWorkerPool struct {
	mu    sync.RWMutex
	Store *WorkerStore
	//	Workers map[string]TerminalWorker
}

func NewTerminalWorkerPool(redis *RedisStore) (*TerminalWorkerPool, error) {
	pool := &TerminalWorkerPool{Store: NewWorkerStore(redis)}
	return pool, nil
}

func findWorker(s []WorkerInfo, host string) (WorkerInfo, bool) {
	for _, a := range s {
		if a.Host == host {
			return a, true
		}
	}
	return WorkerInfo{}, false
}

func (p *TerminalWorkerPool) GetWorker(host string) (TerminalWorker, error) {

	workers, err := p.Store.Workers()

	if err != nil {
		return TerminalWorker{}, err
	}

	worker, found := findWorker(workers, host)

	if !found {
		return TerminalWorker{}, errors.New(fmt.Sprintf("Worker not found for host: %s", host))
	}

	docker, err := NewDocker(worker.Host)
	if err != nil {
		return TerminalWorker{}, err
	}

	return TerminalWorker{Host: host, Docker: docker}, nil

}

func (p *TerminalWorkerPool) Workers() ([]TerminalWorker, error) {

	var workers = make([]TerminalWorker, 0)
	workersInfo, err := p.Store.Workers()

	if err != nil {
		return []TerminalWorker{}, err
	}

	for _, w := range workersInfo {
		docker, err := NewDocker(w.Host)
		if err != nil {
			LogError(fmt.Sprintf("Failed to create docker for host %s", w.Host), err)
			continue
		}
		workers = append(workers, TerminalWorker{Host: w.Host, Docker: docker})
	}

	return workers, nil
}

func (p *TerminalWorkerPool) Locks() ([]WorkerLock, error) {
	return p.Store.Locks()
}

func (p *TerminalWorkerPool) FindLock(modelId string) (WorkerLock, bool, error) {
	locks, err := p.Store.Locks()
	if err != nil {
		return WorkerLock{}, false, err
	}

	for _, lock := range locks {
		if lock.ModelId == modelId {
			return lock, true, nil
		}
	}

	return WorkerLock{}, false, nil
}

func (p *TerminalWorkerPool) Acquire(modelId string) (WorkerLock, error) {
	p.mu.Lock()
	lock, err := p.Store.Acquire(modelId)
	p.mu.Unlock()
	return lock, err
}

func (p *TerminalWorkerPool) Release(modelId string) error {
	p.mu.Lock()
	err := p.Store.Release(modelId)
	p.mu.Unlock()
	return err
}

type ProvisionRequest struct {
	BaseImage   string   `json:"baseimage"`
	Name        string   `json:"name"`
	TemplateUrl string   `json:"templateurl"`
	Listeners   []string `json:"listeners"`
}

func dockerTmpl(tmpl string, image string, out string) error {

	b, err := os.ReadFile(tmpl)
	if err != nil {
		return err
	}

	t, err := template.New("docker-template").Parse(string(b))
	if err != nil {
		return err
	}

	f, err := os.OpenFile(out, os.O_RDWR|os.O_CREATE|os.O_TRUNC, os.FileMode(0755))
	if err != nil {
		return err
	}

	err = t.ExecuteTemplate(f, "docker-template", struct{ Image string }{Image: image})
	if err != nil {
		return err
	}

	return nil
}

func (p *TerminalWorkerPool) AddWorker(host string) error {
	return p.Store.AddWorker(host)
}

func (p *TerminalWorkerPool) RemoveWorker(host string) error {

	p.mu.Lock()
	err := p.Store.DeleteWorker(host)
	p.mu.Unlock()
	log.Printf("Host removed from worker pool %s", host)

	return err
}

func (w *TerminalWorker) Provision(pool *WebSocketPool, store *ProvisionStore, r ProvisionRequest) (types.IDResponse, error) {

	var id types.IDResponse

	notify := func(msg interface{}) {
		switch t := msg.(type) {
		case StatusPayload:
			_ = store.Processing(t.Status)
			log.Printf("%s\n", t.Status)
		case ErrorPayload:
			_ = store.Failed(t.Error)
		}
		pool.DirectMessage(r.Listeners, "worker/provision", SafeMarshal(msg))
	}

	tempdir, err := os.MkdirTemp("", "pkg")
	if err != nil {
		LogError("Failed to create temp directory", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err
	}

	//defer os.RemoveAll(tempdir)
	notify(StatusPayload{Status: fmt.Sprintf("Provisioning temp dir: %s\n", tempdir)})

	pkg := filepath.Join(tempdir, "pkg")
	err = os.MkdirAll(pkg, os.ModePerm)
	if err != nil {
		LogError("Failed to create directory", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err
	}

	tmplpkg := filepath.Join(tempdir, "pkg.tgz")
	notify(StatusPayload{Status: fmt.Sprintf("Downloading Template Package: %s", r.TemplateUrl)})
	err = DownloadFile(r.TemplateUrl, tmplpkg)
	if err != nil {
		LogError("Failed to download template", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err
	}

	notify(StatusPayload{Status: fmt.Sprintf("Extracting: %s to %s", tmplpkg, pkg)})
	tmplfile, err := os.Open(tmplpkg)
	if err != nil {
		LogError("Open pkg file for extraction", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err
	}
	defer tmplfile.Close()

	err = archive.Untar(tmplfile, pkg, &archive.TarOptions{Compression: archive.Gzip, NoLchown: true})
	if err != nil {
		LogError("Failed to extract pkg", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err
	}

	notify(StatusPayload{Status: "Writing template file"})
	dockertmpl := filepath.Join(pkg, "Dockerfile.tmpl")
	dockerfile := filepath.Join(pkg, "Dockerfile")

	err = dockerTmpl(dockertmpl, r.BaseImage, dockerfile)
	if err != nil {
		LogError("Failed templated execution for Dockerfile", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err

	}

	notify(StatusPayload{Status: "Packaging Docker payload"})
	reader, err := archive.Tar(pkg, archive.Gzip)
	if err != nil {
		LogError("Failed packaging docker payload", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err

	}
	defer reader.Close()

	notify(StatusPayload{Status: "Building Image"})

	id, err = w.Docker.Build(pool, r.Listeners, reader, r.Name)
	if err != nil {
		LogError("Failed to build docker image", err)
		notify(ErrorPayload{Error: err.Error()})
		return id, err
	}

	return id, nil

}

func (w *TerminalWorker) Info(verbose bool) TerminalWorkerInfo {
	var info TerminalWorkerInfo

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	dockerInfo, err := w.Docker.Info(ctx)
	if err != nil {
		LogError(fmt.Sprintf("Error connecting to docker for host: %s", w.Host), err)
		info.Status = WORKER_STATUS_DOWN
		info.Info = struct{}{}
	} else {
		info.Status = WORKER_STATUS_UP
		if verbose {
			info.Info = dockerInfo
		} else {
			info.Info = struct{}{}
		}
	}
	return info
}
