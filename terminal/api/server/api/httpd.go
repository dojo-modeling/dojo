package api

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/rs/xid"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"path/filepath"
	"sync"
	"time"
	//"github.com/docker/docker/api/types"
	//"strconv"
)

const (
	CONTEXT_WORKER_LOCK   = "worker-lock"
	CONTEXT_DOCKER_WORKER = "docker-worker"
	CONTEXT_CONTAINER_ID  = "container-id"
)

type ctx struct {
	context *gin.Context
}

func httpContext(c *gin.Context) *ctx {
	return &ctx{context: c}
}

func (c *ctx) getLock() (WorkerLock, bool) {
	lock, exists := c.context.Get(CONTEXT_WORKER_LOCK)
	if !exists {
		LogErrorMsg("Lock not found in context")
		c.context.String(http.StatusInternalServerError, "Lock not found in context")
		c.context.Abort()
		return WorkerLock{}, false
	}

	return lock.(WorkerLock), true
}

func (c *ctx) getWorker() (TerminalWorker, bool) {
	worker, exists := c.context.Get(CONTEXT_DOCKER_WORKER)
	if !exists {
		LogErrorMsg("Worker not found in context")
		c.context.String(http.StatusInternalServerError, "Worker not found in context")
		c.context.Abort()
		return TerminalWorker{}, false
	}

	return worker.(TerminalWorker), true
}

func (c *ctx) getContainerId() (string, bool) {
	containerId, exists := c.context.Get(CONTEXT_CONTAINER_ID)
	if !exists {
		LogErrorMsg("ContainerId not found in context")
		c.context.String(http.StatusInternalServerError, "ContainerId not found in context")
		c.context.Abort()
		return "", false
	}

	return containerId.(string), true
}

func root() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	}
}

func workerNodes(terminalWorkerPool *TerminalWorkerPool, pool *WebSocketPool) gin.HandlerFunc {
	type ResponseObj struct {
		Host    string      `json:"host"`
		Clients int         `json:"clients"`
		Status  string      `json:"status"`
		Info    interface{} `json:"info"`
	}

	return func(c *gin.Context) {
		_, verbose := c.GetQuery("v")

		resp := make([]ResponseObj, 0)
		clientMap := map[string]int{}
		for client, _ := range pool.Clients {
			if n, ok := clientMap[client.DockerServer]; ok {
				clientMap[client.DockerServer] = n + 1
			} else {
				clientMap[client.DockerServer] = 1
			}
		}

		workers, err := terminalWorkerPool.Workers()
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		var respLock sync.Mutex
		wg := sync.WaitGroup{}
		for i := range workers {
			wg.Add(1)
			go func(wg *sync.WaitGroup, w *TerminalWorker, resp *[]ResponseObj, mu *sync.Mutex) {
				defer wg.Done()
				r := ResponseObj{Host: w.Host}
				if n, ok := clientMap[w.Host]; ok {
					r.Clients = n
				} else {
					r.Clients = 0
				}

				info := w.Info(verbose)
				r.Status = info.Status
				r.Info = info.Info
				mu.Lock()
				*resp = append(*resp, r)
				mu.Unlock()
			}(&wg, &workers[i], &resp, &respLock)
		}

		wg.Wait()

		c.JSON(http.StatusOK, resp)
	}
}

func addWorkerNodes(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	type RequestBody struct {
		Host string `json:"host" binding:"required"`
	}

	return func(c *gin.Context) {

		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}

		if err := terminalWorkerPool.AddWorker(requestBody.Host); err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.Status(http.StatusCreated)
	}
}

func deleteWorkerNode(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		host := c.Param("host")
		if err := terminalWorkerPool.RemoveWorker(host); err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.Status(http.StatusCreated)
	}
}

func getWorkerInfo(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {

	return func(c *gin.Context) {
		_, verbose := c.GetQuery("v")
		host := c.Param("host")

		worker, err := terminalWorkerPool.GetWorker(host)
		if err != nil {
			LogError("Error getting workers", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		info := worker.Info(verbose)
		c.JSON(http.StatusOK, gin.H{"host": host, "info": info})
	}
}

func getWorkerLocks(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {

	return func(c *gin.Context) {
		locks, err := terminalWorkerPool.Locks()
		if err != nil {
			LogError("Error getting locks", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.JSON(http.StatusOK, gin.H{"locks": locks})
	}
}

func getWorkerLock() gin.HandlerFunc {
	return func(c *gin.Context) {
		lock, found := httpContext(c).getLock()
		if !found {
			return
		}
		c.JSON(http.StatusOK, lock)
	}
}

func acquireWorkerLock(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {

	return func(c *gin.Context) {
		modelId := c.Param("modelId")

		lock, found, err := terminalWorkerPool.FindLock(modelId)
		if err != nil {
			LogError("Error acquiring lock", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			c.Abort()
			return
		}

		if found {
			c.Header("X-Lock-Host", lock.Host)
			c.Header("X-Lock-Key", lock.LockKey)
			c.String(http.StatusConflict, fmt.Sprintf("Lock already exists for %s", modelId))
			return
		}

		lock, err = terminalWorkerPool.Acquire(modelId)
		if err != nil {
			LogError("Error acquiring lock", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.Header("X-Lock-Host", lock.Host)
		c.Header("X-Lock-Key", lock.LockKey)
		c.Status(http.StatusCreated)
	}
}

func releaseWorkerLock(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {

	return func(c *gin.Context) {
		modelId := c.Param("modelId")
		if err := terminalWorkerPool.Release(modelId); err != nil {
			LogError("Error releasing lock", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.Status(http.StatusCreated)
	}
}

func listContainers() gin.HandlerFunc {
	return func(c *gin.Context) {
		worker, found := httpContext(c).getWorker()
		if !found {
			return
		}
		containers, err := worker.Docker.ListContainers()

		if err != nil {
			c.AbortWithError(http.StatusBadRequest, err)
			return
		}
		c.JSON(http.StatusOK, containers)
	}
}

func inspectContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {

		worker, exists := httpContext(c).getWorker()
		if !exists {
			return
		}

		containerId, foundId := httpContext(c).getContainerId()
		if !foundId {
			return
		}

		container, err := worker.Docker.InspectContainer(containerId)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.JSON(http.StatusOK, container)
	}
}

func provisionState(redis *RedisStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		modelId := c.Param("modelId")
		state, err := GetProvisionState(redis, modelId)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.JSON(http.StatusOK, state)
	}
}

func provisionLastLog(redis *RedisStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		modelId := c.Param("modelId")
		logInfo, err := GetLastProvisionLog(redis, modelId)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.JSON(http.StatusOK, logInfo)
	}
}

func provisionForModel(settings *Settings, terminalWorkerPool *TerminalWorkerPool, pool *WebSocketPool, redis *RedisStore) gin.HandlerFunc {
	type RequestBody struct {
		Name        string   `json:"name" binding:"required"`
		BaseImage   string   `json:"image" binding:"required"`
		Listeners   []string `json:"listeners" binding:"required"`
		TemplateUrl string   `json:"templateUrl,omitempty"`
	}

	return func(c *gin.Context) {
		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}
		modelId := c.Param("modelId")

		lock, found, err := terminalWorkerPool.FindLock(modelId)
		if err != nil {
			LogError("Error searching for lock", err)
			c.String(http.StatusInternalServerError, "Error finding worker")
			c.Abort()
			return
		}

		if found {
			LogError("Error lock already exists for lock", err)
			c.String(http.StatusConflict, fmt.Sprintf("A worker is provisioning or running this model already %s", modelId))
			c.Abort()
			return
		} else {
			lock, err = terminalWorkerPool.Acquire(modelId)
			if err != nil {
				LogError("Error acquiring lock", err)
				c.String(http.StatusInternalServerError, "Error acquiring worker")
				c.Abort()
				return
			}
		}

		var tmplUrl string
		if requestBody.TemplateUrl == "" {
			ctx := c.Request.Context()
			addr := ctx.Value(http.LocalAddrContextKey).(net.Addr)
			//TODO: determine default package file
			tmplUrl = fmt.Sprintf("http://%s/static/pkg.tgz", addr)

		} else {
			tmplUrl = requestBody.TemplateUrl
		}

		worker, err := terminalWorkerPool.GetWorker(lock.Host)
		if err != nil {
			LogError("Failed to find worker for locked host", err)
			c.String(http.StatusInternalServerError, "Error connecting to worker")
			if err := terminalWorkerPool.Release(modelId); err != nil {
				LogError("Error releasing for lock for unsuccessful worker ", err)
			}
			c.Abort()
			return
		}

		provisionId := xid.New().String()
		store := NewProvisionStore(redis, provisionId, modelId)

		if err := store.InitalizeProvisionStore(worker.Host); err != nil {
			LogError("Error setting up provision store", err)
			_ = store.Failed(err.Error())
			c.String(http.StatusInternalServerError, "Error setting up provision store")
			c.Abort()
			return
		}

		go func(w *TerminalWorker, lock *WorkerLock, store *ProvisionStore, redis *RedisStore, modelId string) {
			var provisionSuccessful bool

			defer func() {
				if !provisionSuccessful {
					log.Printf("Provision Unsuccessful releasing worker - modelId %s\n", modelId)
					if err := terminalWorkerPool.Release(modelId); err != nil {
						LogError("Error releasing for lock for unsuccessful provision", err)
					}
				}
			}()

			respid, err := worker.Provision(pool,
				store,
				ProvisionRequest{
					Name:        requestBody.Name,
					BaseImage:   requestBody.BaseImage,
					TemplateUrl: tmplUrl,
					Listeners:   requestBody.Listeners,
				})

			if err != nil {
				LogError("Error provisioning container", err)
				return
			}

			log.Printf("Image ID %s\n", respid.ID)

			_ = store.Processing(fmt.Sprintf("Launching Image ID %s\n", respid.ID))
			id, err := worker.Docker.Launch(respid.ID, requestBody.Name, []string{"entrypoint.sh"})
			if err != nil {
				LogError("Error launching container", err)
				_ = store.Failed(err.Error())
				return
			}

			log.Printf("Container Id %s\n", id)
			_ = store.Ready(fmt.Sprintf("Container Id %s\n", id))
			lock.AssignContainer(redis, id)

			//TODO: revisit is this even necessary anymore?
			_, err = NewContainerStore(redis, id, map[string]string{
				"name":        requestBody.Name,
				"model_id":    modelId,
				"image":       requestBody.BaseImage,
				"launched":    time.Now().Format(time.RFC3339),
				"docker_host": worker.Host,
			})

			if err != nil {
				LogError("Error storing container meta data", err)
				return
			}

			provisionSuccessful = true
		}(&worker, &lock, store, redis, modelId)

		c.String(http.StatusAccepted, fmt.Sprintf("Processing %s", requestBody.Name))
	}
}

func execContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {

	type RequestBody struct {
		Cmd []string `json:"cmd" binding:"required"`
	}

	return func(c *gin.Context) {
		defer LogDuration("Docker Exec", time.Now())

		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}
		worker, exists := httpContext(c).getWorker()
		if !exists {
			return
		}

		containerId, foundId := httpContext(c).getContainerId()
		if !foundId {
			return
		}

		err := worker.Docker.Exec(containerId, requestBody.Cmd)
		if err != nil {
			LogError("docker exec", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.Status(http.StatusCreated)
	}
}

func teardownContainer(terminalWorkerPool *TerminalWorkerPool, shutdownTimerStore *ShutdownTimerStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		worker, exists := httpContext(c).getWorker()
		if !exists {
			return
		}

		containerId, foundId := httpContext(c).getContainerId()
		if !foundId {
			return
		}

		timerExists := shutdownTimerStore.DestroyTimer(&lock)
		if timerExists {
			log.Printf("Removed shutdown timer")
		}

		log.Printf("Stopping container %s for model %s\n", containerId, lock.ModelId)
		err := worker.Docker.Stop(containerId)
		if err != nil {
			LogError("Error stopping container ", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		if err := terminalWorkerPool.Release(lock.ModelId); err != nil {
			LogError("Error releasing for lock for unsuccessful worker ", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.Status(http.StatusCreated)
	}
}

func stopContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {

		worker, exists := httpContext(c).getWorker()
		if !exists {
			return
		}

		containerId, found := httpContext(c).getContainerId()
		if !found {
			return
		}

		err := worker.Docker.Stop(containerId)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.Status(http.StatusCreated)
	}
}

func commitContainer(settings *Settings, terminalWorkerPool *TerminalWorkerPool, pool *WebSocketPool) gin.HandlerFunc {
	type RequestBody struct {
		Tags       []string `json:"tags" binding:"required"`
		Cwd        string   `json:"cwd"`
		Entrypoint []string `json:"entrypoint"`
		Listeners  []string `json:"listeners" binding:"required"`
	}

	return func(c *gin.Context) {

		worker, exists := httpContext(c).getWorker()
		if !exists {
			return
		}

		containerId, found := httpContext(c).getContainerId()
		if !found {
			return
		}

		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}

		log.Printf("Commit Request: %+v\n", requestBody)

		var imageTags []string
		for _, t := range requestBody.Tags {
			tag := fmt.Sprintf("%s/%s", settings.Docker.Org, t)
			imageTags = append(imageTags, tag)
		}

		go worker.Docker.Commit(settings.Docker.Auth, containerId, imageTags, requestBody.Cwd, requestBody.Entrypoint, pool, requestBody.Listeners)
		c.String(http.StatusAccepted, fmt.Sprintf("Processing %s", imageTags))
	}
}

func checkStatus() gin.HandlerFunc {
	type RequestBody struct {
		Url string `json:"url" binding:"required"`
	}

	return func(c *gin.Context) {
		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}
		resp, err := http.Get(requestBody.Url)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.Status(resp.StatusCode)
	}
}

func autoShutdownStart(shutdownTimerStore *ShutdownTimerStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		worker, exists := httpContext(c).getWorker()
		if !exists {
			return
		}
		shutdownTimerStore.CreateResetTimer(&lock, &worker)
		c.Status(http.StatusCreated)
	}
}

func autoShutdownStatus(shutdownTimerStore *ShutdownTimerStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		t, found := shutdownTimerStore.TimeRemaining(&lock)
		if !found {
			c.String(http.StatusNotFound, fmt.Sprintf("No timer found %s", lock.ModelId))
			c.Abort()
			return
		}
		c.JSON(http.StatusOK, gin.H{"seconds": t.Seconds()})
	}
}

func autoShutdownExtend(shutdownTimerStore *ShutdownTimerStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		t, found := shutdownTimerStore.ExtendTimer(&lock)
		if !found {
			c.String(http.StatusNotFound, fmt.Sprintf("No timer found %s", lock.ModelId))
			c.Abort()
			return
		}
		c.JSON(http.StatusOK, gin.H{"seconds": t.Seconds()})
	}
}

func autoShutdownRemove(shutdownTimerStore *ShutdownTimerStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		exists := shutdownTimerStore.DestroyTimer(&lock)
		if !exists {
			c.String(http.StatusNotFound, fmt.Sprintf("No timer found %s", lock.ModelId))
			c.Abort()
			return
		}

		c.Status(http.StatusNoContent)
	}
}

func proxy(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		server := fmt.Sprintf("http://%s:6010", lock.Host)
		remote, err := url.Parse(server)
		if err != nil {
			log.Fatal(err)
		}

		proxy := httputil.NewSingleHostReverseProxy(remote)

		proxy.Director = func(req *http.Request) {
			req.Header = c.Request.Header
			req.Host = remote.Host
			req.URL.Scheme = remote.Scheme
			req.URL.Host = remote.Host
			req.URL.Path = c.Param("proxyPath")
		}

		log.Printf("Proxying %s => %s\n", c.Param("proxyPath"), server)
		proxy.ServeHTTP(c.Writer, c.Request)
	}
}

func redisPing(redis *RedisStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := redis.Ping(); err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.String(http.StatusOK, "pong")
	}
}

func showBuild() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, GlobalBuildInfo)
	}
}

func showPool(pool *WebSocketPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK,
			gin.H{
				"size": len(pool.Clients),
			})
	}
}

func WithLockMiddleware(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		modelId := c.Param("modelId")

		lock, found, err := terminalWorkerPool.FindLock(modelId)
		if err != nil {
			LogError("Error acquiring lock", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			c.Abort()
			return
		}

		if !found {
			c.String(http.StatusNotFound, fmt.Sprintf("No worker assigned to model %s", modelId))
			c.Abort()
			return
		}

		c.Set(CONTEXT_WORKER_LOCK, lock)

		c.Next()
	}
}

func WithDockerWorkerMiddleware(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {

		lockVal, exists := c.Get(CONTEXT_WORKER_LOCK)
		if !exists {
			LogErrorMsg("Middleware: Lock does not exist for context")
			c.String(http.StatusInternalServerError, "Lock does not exist for context")
			c.Abort()
			return
		}
		lock := lockVal.(WorkerLock)

		worker, err := terminalWorkerPool.GetWorker(lock.Host)
		if err != nil {
			LogError("Failed to find worker for locked host", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			c.Abort()
			return
		}

		c.Set(CONTEXT_DOCKER_WORKER, worker)

		c.Next()
	}
}

func WithContainerIdMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		lockVal, exists := c.Get(CONTEXT_WORKER_LOCK)
		if !exists {
			LogErrorMsg("Middleware: Lock does not exist for context")
			c.String(http.StatusInternalServerError, "Lock does not exist for context")
			c.Abort()
			return
		}
		lock := lockVal.(WorkerLock)

		if lock.ContainerId == "" || lock.ContainerId == "unset" {
			LogErrorMsg("Middleware: Could not determine container for worker")
			c.String(http.StatusInternalServerError, "Could not determine container for worker")
			c.Abort()
			return
		}

		c.Set(CONTEXT_CONTAINER_ID, lock.ContainerId)

		c.Next()
	}
}

func UpdateBuildPackage(mu sync.Mutex, settings *Settings) gin.HandlerFunc {
	return func(c *gin.Context) {
		f, err := c.FormFile("pkg")
		if err != nil {
			LogError("Error determining file", err)
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			c.Abort()
			return
		}

		mu.Lock()
		err = c.SaveUploadedFile(f, filepath.Join(settings.Http.Static, "pkg.tgz"))
		mu.Unlock()
		if err != nil {
			LogError("Error saving upload file", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			c.Abort()
			return
		}

		c.Status(http.StatusCreated)
	}
}

//WebSocket Handler
func ServeWebSocket(settings *Settings, pool *WebSocketPool, terminalWorkerPool *TerminalWorkerPool, redisStore *RedisStore) gin.HandlerFunc {
	return func(c *gin.Context) {

		lock, found := httpContext(c).getLock()
		if !found {
			return
		}

		log.Printf("WebSocket Upgrade\n")
		conn, err := WebSocketUpgrade(c.Writer, c.Request)
		if err != nil {
			fmt.Fprintf(c.Writer, "%+v\n", err)
			return
		}

		id := c.DefaultQuery("id", xid.New().String())
		client := NewWebSocketClient(conn, pool, lock.Host, settings, redisStore, id, lock.ModelId)

		pool.Register <- client
		pool.DirectMessage([]string{client.ID}, "id", client.ID)
		go client.KeepAlive()
		go client.Read()
	}
}

func SetupRoutes(
	pool *WebSocketPool,
	settings *Settings,
	terminalWorkerPool *TerminalWorkerPool,
	shutdownTimerStore *ShutdownTimerStore,
	redisStore *RedisStore) *gin.Engine {

	router := gin.Default()
	router.GET("/", root())

	router.StaticFS("/static", http.Dir(settings.Http.Static))

	router.POST("/cors/test", checkStatus())

	redisGroup := router.Group("/redis")
	{
		redisGroup.GET("/ping", redisPing(redisStore))
	}

	var packageUploadLock sync.Mutex

	adminGroup := router.Group("/admin")
	{
		adminGroup.GET("/build", showBuild())
		adminGroup.GET("/pool", showPool(pool))
		adminGroup.POST("/docker/build/context", UpdateBuildPackage(packageUploadLock, settings))
	}

	dockerGroup := router.Group("/docker")
	{
		dockerGroup.GET("/nodes", workerNodes(terminalWorkerPool, pool))
		dockerGroup.PUT("/nodes", addWorkerNodes(terminalWorkerPool))
		dockerGroup.DELETE("/node/:host", deleteWorkerNode(terminalWorkerPool))
		dockerGroup.GET("/nodes/:host", getWorkerInfo(terminalWorkerPool))

		dockerGroup.GET("/locks", getWorkerLocks(terminalWorkerPool))
		dockerGroup.GET("/locks/:modelId", WithLockMiddleware(terminalWorkerPool), getWorkerLock())
		dockerGroup.GET("/lock/:modelId", acquireWorkerLock(terminalWorkerPool))
		dockerGroup.DELETE("/lock/:modelId", releaseWorkerLock(terminalWorkerPool))
	}

	router.GET("/ws/:modelId", WithLockMiddleware(terminalWorkerPool), ServeWebSocket(settings, pool, terminalWorkerPool, redisStore))

	container := router.Group("/container/:modelId/ops")
	{
		//proxy to containers api
		container.Use(WithLockMiddleware(terminalWorkerPool))
		container.Any("/*proxyPath", proxy(terminalWorkerPool))
	}

	router.GET("/provision/state/:modelId", provisionState(redisStore))
	router.GET("/provision/last/log/:modelId", provisionLastLog(redisStore))
	router.POST("/docker/provision/:modelId", provisionForModel(settings, terminalWorkerPool, pool, redisStore))

	dockerNodeGroup := router.Group("/docker/:modelId")
	{
		dockerNodeGroup.Use(WithLockMiddleware(terminalWorkerPool))
		dockerNodeGroup.Use(WithDockerWorkerMiddleware(terminalWorkerPool))

		dockerNodeGroup.GET("/containers", listContainers())
		dockerNodeGroup.POST("/commit", WithContainerIdMiddleware(), commitContainer(settings, terminalWorkerPool, pool))
		dockerNodeGroup.POST("/exec", WithContainerIdMiddleware(), execContainer(terminalWorkerPool))
		dockerNodeGroup.GET("/inspect", WithContainerIdMiddleware(), inspectContainer(terminalWorkerPool))

		dockerNodeGroup.DELETE("/stop", WithContainerIdMiddleware(), stopContainer(terminalWorkerPool))
		dockerNodeGroup.DELETE("/release", WithContainerIdMiddleware(), teardownContainer(terminalWorkerPool, shutdownTimerStore))

		dockerNodeGroup.PUT("/shutdown/start", autoShutdownStart(shutdownTimerStore))
		dockerNodeGroup.GET("/shutdown/status", autoShutdownStatus(shutdownTimerStore))
		dockerNodeGroup.GET("/shutdown/extend", autoShutdownExtend(shutdownTimerStore))
		dockerNodeGroup.DELETE("/shutdown", autoShutdownRemove(shutdownTimerStore))

	}

	return router
}
