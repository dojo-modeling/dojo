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
	"github.com/docker/docker/pkg/jsonmessage"
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

type Docker struct {
	Client *client.Client
	Host   string
}

type UploadComplete struct {
	Finished []string `json:"finished"`
}

type BuildComplete struct {
	Finished string `json:"finished"`
}

func NewDocker(host string) (*Docker, error) {
	client_host := client.WithHost(fmt.Sprintf("tcp://%s:8375", host))
	cli, err := client.NewClientWithOpts(client_host, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &Docker{Client: cli, Host: host}, nil
}

func (docker *Docker) Info(c context.Context) (types.Info, error) {
	return docker.Client.Info(c)
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

	pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(StatusPayload{Status: "Committing Container"}))
	img, err := docker.Client.ContainerCommit(ctx, containerID, options)
	if err != nil {
		LogError("Container Commit", err)
		pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(ErrorPayload{Error: err.Error()}))
		return err
	}

	for _, tag := range tags {

		log.Printf("Tagging %s", tag)
		pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(StatusPayload{Status: fmt.Sprintf("Tagging %s", tag)}))
		if err := docker.Client.ImageTag(ctx, img.ID, tag); err != nil {
			LogError("Image Tag", err)
			pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(ErrorPayload{Error: err.Error()}))
			return err
		}

		resp, err := docker.Client.ImagePush(ctx, tag, types.ImagePushOptions{RegistryAuth: auth})
		pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(StatusPayload{Status: fmt.Sprintf("Pushing Tag: %s", tag)}))
		if err != nil {
			LogError("Image Push", err)
			pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(ErrorPayload{Error: err.Error()}))
			return err
		}

		reader := bufio.NewReader(resp)
		for {
			line, err := reader.ReadBytes('\n')
			if err != nil {
				if err != io.EOF {
					LogError("Reading Response", err)
					pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(ErrorPayload{Error: err.Error()}))
					return err
				}
				break
			}

			log.Printf("%s", string(line))
			pool.DirectMessage(listenClients, "docker/publish", string(line))
		}

		pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(StatusPayload{Status: fmt.Sprintf("Finished Pushing Tag: %s", tag)}))
	}

	if err != nil {
		LogError("Failed to Marshal Complete Response", err)
		pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(ErrorPayload{Error: err.Error()}))
		return err
	}
	pool.DirectMessage(listenClients, "docker/publish", SafeMarshal(UploadComplete{Finished: tags}))
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
		AutoRemove:   true,
		Privileged:   true,
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
		Hostname: "dojo.local",
		Image:    image,
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

func (docker *Docker) Build(pool *WebSocketPool, listenClients []string, body io.Reader, tag string) (types.IDResponse, error) {

	var result types.IDResponse

	resp, err := docker.Client.ImageBuild(context.Background(),
		body,
		types.ImageBuildOptions{
			Tags:           []string{tag},
			SuppressOutput: false,
			PullParent:     true,
			ForceRemove:    true,
			Remove:         true,
		})

	if err != nil {
		log.Printf("Error %+v", err)
		return result, err
	}

	log.Printf("Building OS Type %s\n", resp.OSType)

	decoder := json.NewDecoder(resp.Body)
	for {
		var jsonMessage jsonmessage.JSONMessage
		if err := decoder.Decode(&jsonMessage); err != nil {
			if err == io.EOF {
				break
			}
			LogError("Reading Response", err)
			pool.DirectMessage(listenClients, "docker/build", SafeMarshal(ErrorPayload{Error: err.Error()}))
			return result, err
		}
		if err := jsonMessage.Error; err != nil {
			LogError("Error during docker build", err)
			pool.DirectMessage(listenClients, "docker/build", SafeMarshal(ErrorPayload{Error: err.Error()}))
			return result, err
		}
		if jsonMessage.Aux != nil {
			var r types.BuildResult
			if err := json.Unmarshal(*jsonMessage.Aux, &r); err != nil {
				LogError("Failed to unmarshal aux message. Cause: %s", err)
				pool.DirectMessage(listenClients, "docker/build", SafeMarshal(ErrorPayload{Error: err.Error()}))
			} else {
				result.ID = r.ID
			}
		}

		pool.DirectMessage(listenClients, "docker/build", SafeMarshal(jsonMessage))
	}
	log.Printf("Docker Build Complete. Tag: %s, ID: %s\n", tag, result.ID)
	pool.DirectMessage(listenClients, "docker/build", SafeMarshal(BuildComplete{Finished: tag}))
	return result, nil
}
