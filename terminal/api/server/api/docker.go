package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	//"io/ioutil"
	"io"

	"bufio"
	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
	//"github.com/docker/docker/api/types/network"
	//specs "github.com/opencontainers/image-spec/specs-go/v1"
)

const CgroupnsModeHost = "host"

type ErrorPayload struct {
	Error string `json:"error"`
}

type StatusPayload struct {
	Status string `json:"status"`
}

func safeMarshal(v interface{}) string {
	bytes, err := json.Marshal(v)
	if err != nil {
		LogError("toJSON Marshal error", err)
		return err.Error()
	}
	return string(bytes)
}

// Helper for verbosity sake
func notify(p *WebSocketPool, listeners []string, payload string) {
	p.Direct <- DirectMessage{
		Clients: listeners,
		Message: WebSocketMessage{Channel: "docker/publish", Payload: payload},
	}
}

type Docker struct {
	Client *client.Client
	Host   string
}

type UploadComplete struct {
	Finished []string `json:"finished"`
}

func NewDocker(host string, port string) (*Docker, error) {
	// If host doesn't contain a port, set port to default
	client_host := client.WithHost(fmt.Sprintf("tcp://%s:%s", host, port))
	cli, err := client.NewClientWithOpts(client_host, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &Docker{Client: cli, Host: host}, nil
}

func (docker *Docker) ListContainers() ([]types.Container, error) {
	return docker.Client.ContainerList(context.Background(), types.ContainerListOptions{})
}

func (docker *Docker) InspectContainer(containerID string) (types.ContainerJSON, error) {
	return docker.Client.ContainerInspect(context.Background(), containerID)
}

func (docker *Docker) PullImage(image string) error {
	resp, err := docker.Client.ImagePull(context.Background(), image, types.ImagePullOptions{})
	if err != nil {
		LogError("Container ImagePull", err)
		return err
	}

	reader := bufio.NewReader(resp)
	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err != io.EOF {
				LogError("Reading Response", err)
				return err
			}
			break
		}

		log.Printf("%s", string(line))
	}

	return err
}

func (docker *Docker) Changes(containerID string) ([]container.ContainerChangeResponseItem, error) {
	changes, err := docker.Client.ContainerDiff(context.Background(), containerID)
	return changes, err
}

func (docker *Docker) Commit(
	auth string,
	containerID string,
	tags []string,
	cwd string,
	entrypoint []string,
	pool *WebSocketPool,
	listenClients []string,
) error {

	ctx := context.Background()

	options := types.ContainerCommitOptions{
		Config: &container.Config{
			WorkingDir: cwd,
			Entrypoint: entrypoint,
			Cmd:        []string{},
		},
	}

	notify(pool, listenClients, safeMarshal(StatusPayload{Status: "Committing Container"}))
	img, err := docker.Client.ContainerCommit(ctx, containerID, options)
	if err != nil {
		LogError("Container Commit", err)
		notify(pool, listenClients, safeMarshal(ErrorPayload{Error: err.Error()}))
		return err
	}

	for _, tag := range tags {

		log.Printf("Tagging %s", tag)
		notify(pool, listenClients, safeMarshal(StatusPayload{Status: fmt.Sprintf("Tagging %s", tag)}))
		if err := docker.Client.ImageTag(ctx, img.ID, tag); err != nil {
			LogError("Image Tag", err)
			notify(pool, listenClients, safeMarshal(ErrorPayload{Error: err.Error()}))
			return err
		}

		resp, err := docker.Client.ImagePush(ctx, tag, types.ImagePushOptions{RegistryAuth: auth})
		notify(pool, listenClients, safeMarshal(StatusPayload{Status: fmt.Sprintf("Pushing Tag: %s", tag)}))
		if err != nil {
			LogError("Image Push", err)
			notify(pool, listenClients, safeMarshal(ErrorPayload{Error: err.Error()}))
			return err
		}

		reader := bufio.NewReader(resp)
		for {
			line, err := reader.ReadBytes('\n')
			if err != nil {
				if err != io.EOF {
					LogError("Reading Response", err)
					notify(pool, listenClients, safeMarshal(ErrorPayload{Error: err.Error()}))
					return err
				}
				break
			}

			log.Printf("%s", string(line))
			notify(pool, listenClients, string(line))
		}

		notify(pool, listenClients, safeMarshal(StatusPayload{Status: fmt.Sprintf("Finished Pushing Tag: %s", tag)}))

	}

	if err != nil {
		LogError("Failed to Marshal Complete Response", err)
		notify(pool, listenClients, safeMarshal(ErrorPayload{Error: err.Error()}))
		return err
	}
	notify(pool, listenClients, safeMarshal(UploadComplete{Finished: tags}))
	return nil
}

func (docker *Docker) Stop(containerID string) error {
	//timeout := 60 * time.Second
	err := docker.Client.ContainerStop(context.Background(), containerID, nil)
	if err != nil {
		LogError("Container Stop", err)
		return err
	}
	return nil
}

type ExecResult struct {
	ExitCode  int
	outBuffer *bytes.Buffer
	errBuffer *bytes.Buffer
}

func (res *ExecResult) StdOut() string {
	return res.outBuffer.String()
}

func (res *ExecResult) StdErr() string {
	return res.errBuffer.String()
}

func (res *ExecResult) Combined() string {
	return res.outBuffer.String() + res.errBuffer.String()
}

func (docker *Docker) Exec(containerID string, cmd []string) error {
	ctx := context.Background()
	id, err := docker.Client.ContainerExecCreate(ctx,
		containerID,
		types.ExecConfig{
			AttachStdout: true,
			AttachStderr: true,
			Cmd:          cmd,
		})
	if err != nil {
		LogError("Container Exec Create", err)
		return err
	}

	log.Printf("Attach: %+v", cmd)
	aresp, err := docker.Client.ContainerExecAttach(ctx, id.ID, types.ExecStartCheck{})
	if err != nil {
		LogError("Container Exec Attach", err)
		return err
	}
	defer aresp.Close()

	// read the output
	var outBuf, errBuf bytes.Buffer
	outputDone := make(chan error)

	go func() {
		// StdCopy demultiplexes the stream into two buffers
		_, err = stdcopy.StdCopy(&outBuf, &errBuf, aresp.Reader)
		outputDone <- err
	}()

	select {
	case err := <-outputDone:
		if err != nil {
			LogError("Output", err)
			return err
		}
		break

	case <-ctx.Done():
		return ctx.Err()
	}

	// get the exit code
	log.Printf("Inspect: %+v", id)
	iresp, err := docker.Client.ContainerExecInspect(ctx, id.ID)
	if err != nil {
		LogError("Containe Exec Inspect", err)
		return err
	}

	exec := ExecResult{ExitCode: iresp.ExitCode, outBuffer: &outBuf, errBuffer: &errBuf}

	log.Printf("exit: %d, out: %s", exec.ExitCode, exec.Combined())

	if exec.ExitCode != 0 {
		return errors.New(exec.StdErr())
	}
	return nil

}

func (docker *Docker) Launch(image string, name string, entryPoint []string) (string, error) {
	if *PULL_IMAGES {
		if err := docker.PullImage(image); err != nil {
			return "", err
		}
	}
	hostConfig := &container.HostConfig{
		AutoRemove: true,
		Privileged: true,
		CgroupnsMode: CgroupnsModeHost,
		PortBindings: nat.PortMap{
			"22/tcp": []nat.PortBinding{
				{
					HostPort: "2224",
				},
			},
			"6010/tcp": []nat.PortBinding{
				{
					HostPort: "6010",
				},
			},
		},
	}

	containerConfig := &container.Config{
		Image: image,
		ExposedPorts: nat.PortSet{
			"22/tcp":   {},
			"6010/tcp": {},
		},
	}

	if entryPoint != nil {
		containerConfig.Entrypoint = entryPoint
	}

	container, err := docker.Client.ContainerCreate(context.Background(),
		containerConfig,
		hostConfig,
		nil, //&network.NetworkingConfig{},
		nil, //&specs.Platform{},
		name,
	)

	if err != nil {
		return "", err
	}

	err = docker.Client.ContainerStart(context.Background(),
		container.ID,
		types.ContainerStartOptions{})

	return container.ID, err

}
