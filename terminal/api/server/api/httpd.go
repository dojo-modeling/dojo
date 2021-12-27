package api

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	//"github.com/docker/docker/api/types"
	"strconv"
)

func root() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	}
}

func workerNodes(terminalWorkerPool *TerminalWorkerPool, pool *WebSocketPool) gin.HandlerFunc {
	type ResponseObj struct {
		Idx     int    `json:"i"`
		Host    string `json:"host"`
		Clients int    `json:"clients"`
	}

	return func(c *gin.Context) {
		resp := make([]ResponseObj, 0)
		clientMap := map[string]int{}
		for client, _ := range pool.Clients {
			if c, ok := clientMap[client.DockerServer]; ok {
				clientMap[client.DockerServer] = c + 1
			} else {
				clientMap[client.DockerServer] = 1
			}
		}

		for i, worker := range terminalWorkerPool.Workers {
			if c, ok := clientMap[worker.Host]; ok {
				resp = append(resp, ResponseObj{Idx: i, Host: worker.Host, Clients: c})
			} else {
				resp = append(resp, ResponseObj{Idx: i, Host: worker.Host, Clients: 0})
			}
		}

		c.JSON(http.StatusOK, resp)
	}
}

func listContainers(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		containers, err := terminalWorkerPool.Workers[i].Docker.ListContainers()

		if err != nil {
			c.AbortWithError(http.StatusBadRequest, err)
			return
		}
		c.JSON(http.StatusOK, containers)
	}
}

func inspectContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		container, err := terminalWorkerPool.Workers[i].Docker.InspectContainer(id)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.JSON(http.StatusOK, container)
	}
}

func launchContainer(settings *Settings, terminalWorkerPool *TerminalWorkerPool, redis *RedisStore) gin.HandlerFunc {

	type RequestBody struct {
		Name        string `json:"name" binding:"required"`
		DockerImage string `json:"image" binding:"required"`
		ModelId     string `json:"modelId" binding:"required"`
	}

	return func(c *gin.Context) {
		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}

		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		id, err := terminalWorkerPool.Workers[i].Docker.Launch(requestBody.DockerImage, requestBody.Name, []string{"entrypoint.sh"})
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		store := NewContainerStore(redis, id)
		store.InitalizeContainerStore()

		if err := store.AddMeta(map[string]string{
			"name":        requestBody.Name,
			"model_id":    requestBody.ModelId,
			"image":       requestBody.DockerImage,
			"launched":    time.Now().Format(time.RFC3339),
			"docker_host": terminalWorkerPool.Workers[i].Docker.Host,
			"docker_node": idx,
		}); err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		c.JSON(http.StatusOK, gin.H{"id": id})
	}
}

func execContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {

	type RequestBody struct {
		Cmd []string `json:"cmd" binding:"required"`
	}

	return func(c *gin.Context) {
		defer LogDuration("Docker Exec", time.Now())
		id := c.Param("id")
		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.String(http.StatusBadRequest, fmt.Sprintf("%+v", err))
			return
		}

		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		err = terminalWorkerPool.Workers[i].Docker.Exec(id, requestBody.Cmd)
		if err != nil {
			LogError("docker exec", err)
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.String(http.StatusOK, "ok")
	}
}

func stopContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		err = terminalWorkerPool.Workers[i].Docker.Stop(id)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.String(http.StatusOK, "ok")
	}
}

func changesContainer(terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		changes, err := terminalWorkerPool.Workers[i].Docker.Changes(id)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.JSON(http.StatusOK, changes)
	}
}

func diffGetContainer(store *ContainerDiffStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		diffs, err := store.Diff(id)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.JSON(http.StatusOK, diffs)
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
		defer LogDuration("Docker Commit", time.Now())
		id := c.Param("id")
		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
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

		go terminalWorkerPool.Workers[i].Docker.Commit(settings.Docker.Auth, id, imageTags, requestBody.Cwd, requestBody.Entrypoint, pool, requestBody.Listeners)
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

func proxy(settings *Settings, terminalWorkerPool *TerminalWorkerPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		idx := c.Param("idx")
		i, err := strconv.Atoi(idx)

		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		var worker = terminalWorkerPool.Workers[i].Docker.Host

		server := fmt.Sprintf("http://%s:6010", worker)
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

func appendHistory(redis *RedisStore) gin.HandlerFunc {

	type RequestBody struct {
		Text string `json:"text" binding:"required"`
		Cwd  string `json:"cwd" binding:"required"`
	}

	return func(c *gin.Context) {
		id := c.Param("id")
		var json RequestBody
		if err := c.BindJSON(&json); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := NewContainerStore(redis, id).AddHistory(map[string]string{
			"text": json.Text,
			"cwd":  json.Cwd,
		}); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.String(http.StatusOK, "ok")
	}
}

func appendProvisions(redis *RedisStore) gin.HandlerFunc {

	type RequestBody struct {
		Provisions [][]string `json:"provisions" binding:"required"`
	}
	return func(c *gin.Context) {
		id := c.Param("id")
		var json RequestBody
		if err := c.BindJSON(&json); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := NewContainerStore(redis, id).AddProvisions(json.Provisions); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.String(http.StatusOK, "ok")
	}
}

func appendEdits(redis *RedisStore) gin.HandlerFunc {
	type RequestBody struct {
		File string `json:"file" binding:"required"`
		Text string `json:"text" binding:"required"`
	}

	return func(c *gin.Context) {
		id := c.Param("id")
		var requestBody RequestBody
		if err := c.BindJSON(&requestBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		edit := map[string]string{"file": requestBody.File, "text": requestBody.Text}

		if err := NewContainerStore(redis, id).AddEdits(edit); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.String(http.StatusOK, "ok")
	}
}
func addMeta(redis *RedisStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var requestBody map[string]string
		if err := c.BindJSON(&requestBody); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := NewContainerStore(redis, id).AddMeta(requestBody); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.String(http.StatusOK, "ok")
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

func SetupRoutes(
	pool *WebSocketPool,
	settings *Settings,
	terminalWorkerPool *TerminalWorkerPool,
	redisStore *RedisStore) *gin.Engine {

	router := gin.Default()
	router.GET("/", root())

	if *DEBUG_ENABLED {
		router.StaticFile("/term", "index.html")
	}

	router.POST("/cors/test", checkStatus())

	router.GET("/ws/:idx", ServeWebSocket(settings, pool, terminalWorkerPool, redisStore))

	redisGroup := router.Group("/redis")
	{
		redisGroup.GET("/ping", redisPing(redisStore))
	}

	adminGroup := router.Group("/admin")
	{
		adminGroup.GET("/build", showBuild())
		adminGroup.GET("/pool", showPool(pool))
	}

	containerStore := router.Group("/container/store/:id")
	{
		containerStore.PUT("/edits", appendEdits(redisStore))
		containerStore.PUT("/history", appendHistory(redisStore))
		containerStore.PUT("/meta", addMeta(redisStore))
		containerStore.PUT("/provisions", appendProvisions(redisStore))
	}

	// disabled to support multiple docker hosts
	// containerDiffs := router.Group("/container/diffs")
	// {
	//	//containerDiffs.PUT("/:id", diffSetContainer(containerDiffStore))
	//	containerDiffs.GET("/:id", diffGetContainer(containerDiffStore))
	// }

	container := router.Group("/container/:idx/ops")
	{
		//proxy to containers api
		container.Any("/*proxyPath", proxy(settings, terminalWorkerPool))
	}

	dockerGroup := router.Group("/docker")
	{
		dockerGroup.GET("/nodes", workerNodes(terminalWorkerPool, pool))
	}

	dockerNodeGroup := router.Group("/docker/:idx")
	{
		dockerNodeGroup.POST("/launch", launchContainer(settings, terminalWorkerPool, redisStore))
		dockerNodeGroup.GET("/containers", listContainers(terminalWorkerPool))
		dockerNodeGroup.POST("/commit/:id", commitContainer(settings, terminalWorkerPool, pool))
		dockerNodeGroup.GET("/changes/:id", changesContainer(terminalWorkerPool))
		dockerNodeGroup.POST("/exec/:id", execContainer(terminalWorkerPool))
		dockerNodeGroup.GET("/inspect/:id", inspectContainer(terminalWorkerPool))

		dockerNodeGroup.DELETE("/stop/:id", stopContainer(terminalWorkerPool))
	}

	return router
}
