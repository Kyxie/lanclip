package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/websocket"
	"lanclip/hub"
	"lanclip/store"
)

//go:embed all:static
var staticFiles embed.FS

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	maxHistory := 5
	if v := os.Getenv("MAX_HISTORY"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			maxHistory = n
		}
	}

	port := "3000"
	if v := os.Getenv("PORT"); v != "" {
		port = v
	}

	s := store.New(maxHistory)
	h := hub.New()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]int{"maxHistory": maxHistory})
	})

	mux.HandleFunc("GET /api/clips", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(s.GetAll())
	})

	mux.HandleFunc("POST /api/clips", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Content string `json:"content"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Content == "" {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}
		clips := s.Add(body.Content)
		data, _ := json.Marshal(map[string]any{"type": "clips_updated", "clips": clips})
		h.Broadcast(data)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(clips)
	})

	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("ws upgrade: %v", err)
			return
		}
		client := h.NewClient(conn)
		h.Register(client)
		defer h.Unregister(client)

		clips := s.GetAll()
		data, _ := json.Marshal(map[string]any{"type": "clips_updated", "clips": clips})
		client.Send(data)

		go client.WritePump()

		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	})

	staticFS, _ := fs.Sub(staticFiles, "static")
	mux.Handle("/", http.FileServer(http.FS(staticFS)))

	log.Printf("LAN Clip on :%s  MAX_HISTORY=%d", port, maxHistory)
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), cors(mux)); err != nil {
		log.Fatal(err)
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
