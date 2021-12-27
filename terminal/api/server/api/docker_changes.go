package api

import (
	"github.com/docker/docker/api/types/container"
	"log"
	"sort"
	"sync"
	"time"
)

type ContainerDiffStore struct {
	changeSet map[string][]container.ContainerChangeResponseItem
	docker    *Docker
	mu        sync.RWMutex
}

type ContainerDiff struct {
	Add    []container.ContainerChangeResponseItem `json:"add"`
	Remove []container.ContainerChangeResponseItem `json:"rm"`
}

func NewContainerDiffStore(docker *Docker) *ContainerDiffStore {
	return &ContainerDiffStore{
		changeSet: map[string][]container.ContainerChangeResponseItem{},
		docker:    docker,
	}
}

func (store *ContainerDiffStore) SetState(containerId string) error {
	defer LogDuration("set container state", time.Now())
	changes, err := store.docker.Changes(containerId)

	if err != nil {
		return err
	}

	store.mu.Lock()
	store.changeSet[containerId] = changes
	store.mu.Unlock()
	return nil
}

// Compares 2 sorted lists of container items
func sortedDiff(
	compare func(*container.ContainerChangeResponseItem, *container.ContainerChangeResponseItem) int,
	a *[]container.ContainerChangeResponseItem,
	b *[]container.ContainerChangeResponseItem,
	add *[]container.ContainerChangeResponseItem,
	rm *[]container.ContainerChangeResponseItem) {
	defer LogDuration("diff time", time.Now())
	la := len(*a)
	lb := len(*b)

	for i, j := 0, 0; ; {

		if i >= la && j >= lb {
			break
		}

		if i >= la {
			*add = append(*add, (*b)[j])
			j++
			continue
		}

		if j >= lb {
			*rm = append(*rm, (*a)[i])
			i++
			continue
		}

		switch compare(&((*a)[i]), &((*b)[j])) {
		case -1:
			*rm = append(*rm, (*a)[i])
			i++
			continue
		case 0:
			i++
			j++
			continue
		case 1:
			*add = append(*add, (*b)[j])
			j++
			continue
		}
	}
}

func (store *ContainerDiffStore) Diff(containerId string) (ContainerDiff, error) {
	defer LogDuration("container diff", time.Now())

	diff := ContainerDiff{
		Add:    []container.ContainerChangeResponseItem{},
		Remove: []container.ContainerChangeResponseItem{},
	}

	curState, err := store.docker.Changes(containerId)
	if err != nil {
		return diff, err
	}

	prevState, ok := store.changeSet[containerId]
	if !ok {
		diff.Add = curState
	} else {
		sort.Slice(prevState, func(i, j int) bool {
			return prevState[i].Path < prevState[j].Path
		})

		sort.Slice(curState, func(i, j int) bool {
			return curState[i].Path < curState[j].Path
		})

		log.Printf("Comparing Sets a{%d} | b:{%d}\n", len(prevState), len(curState))

		comparator := func(a *container.ContainerChangeResponseItem,
			b *container.ContainerChangeResponseItem) int {
			if a.Path == b.Path {
				return 0
			}
			if a.Path < b.Path {
				return -1
			}
			return 1
		}
		sortedDiff(comparator, &prevState, &curState, &diff.Add, &diff.Remove)
	}

	//update store state
	store.mu.Lock()
	store.changeSet[containerId] = curState
	store.mu.Unlock()
	return diff, nil

}
