package app

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/rs/xid"
	"net/http"
	"os"
	"strings"
)

func root() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	}
}

func catHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Query("path")
		if path == "" {
			c.String(http.StatusBadRequest, "path cannot be empty")
			c.Abort()
			return
		}
		b, err := os.ReadFile(path)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.Data(http.StatusOK, "text/plain; charset=utf-8", b)
	}
}

func saveHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Query("path")
		if path == "" {
			c.String(http.StatusBadRequest, "path cannot be empty")
			c.Abort()
			return
		}
		if c.Request.Body == nil {
			c.String(http.StatusBadRequest, "Please send a request body")
			c.Abort()
			return
		}

		contents, _ := c.GetRawData()
		f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0755)
		defer f.Close()
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}

		_, err = f.Write(contents)
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.String(http.StatusOK, "ok")
	}
}

func containerID() (string, error) {
	if *DEV_MODE {
		return "dev-dummy-id", nil
	}

	data, err := os.ReadFile("/proc/1/cpuset")
	if err != nil {
		return "", err
	}
	contents := strings.TrimSpace(string(data))
	containerParts := strings.Split(contents, "/docker/")
	containerID := containerParts[len(containerParts)-1]
	return containerID, nil
}

func serveWebSocket(pool *WebSocketPool) gin.HandlerFunc {
	return func(c *gin.Context) {
		fmt.Println("WebSocket Connecting...")
		conn, err := WebSocketUpgrade(c.Writer, c.Request)
		if err != nil {
			fmt.Fprintf(c.Writer, "%+v\n", err)
			return
		}

		containerID, err := containerID()
		if err != nil {
			fmt.Fprintf(c.Writer, "%+v\n", err)
			return
		}

		client := &WebSocketClient{
			ID:          xid.New().String(),
			ContainerID: containerID,
			Conn:        conn,
			Pool:        pool,
		}

		pool.Register <- client
		go client.KeepAlive()
		client.Read()
	}
}

func containerHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		containerID, err := containerID()
		if err != nil {
			c.String(http.StatusInternalServerError, fmt.Sprintf("%+v", err))
			return
		}
		c.JSON(http.StatusOK, gin.H{"id": containerID})
	}
}

func showBuild() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, GlobalBuildInfo)
	}
}

func SetupRoutes(pool *WebSocketPool) *gin.Engine {

	router := gin.Default()

	router.GET("/", root())
	router.GET("/websocket", serveWebSocket(pool))
	router.GET("/cat", catHandler())
	router.POST("/save", saveHandler())
	router.GET("/container", containerHandler())

	adminGroup := router.Group("/admin")
	{
		adminGroup.GET("/build", showBuild())
	}

	return router
}
