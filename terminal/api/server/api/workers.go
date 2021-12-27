package api

type TerminalWorker struct {
	Host   string  `json:"host"`
	Docker *Docker `json:"-"`
}

type TerminalWorkerPool struct {
	Workers []TerminalWorker
}

func NewTerminalWorkerPool(settings *Settings) (*TerminalWorkerPool, error) {
	pool := &TerminalWorkerPool{Workers: make([]TerminalWorker, 0)}
	for _, worker := range settings.Docker.Hosts {
		if docker, err := NewDocker(worker.Host, worker.Port); err != nil {
			return pool, err
		} else {
			pool.Workers = append(pool.Workers, TerminalWorker{
				Host:   worker.Host,
				Docker: docker,
			})
		}
	}
	return pool, nil
}
