package main

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gorilla/websocket"
	"lanclip/hub"
	"lanclip/store"
)

const maxFileSize int64 = 100 << 20 // 100 MiB
const maxUploadRequestSize = maxFileSize + (1 << 20)

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

	mux.HandleFunc("POST /api/file", func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxUploadRequestSize)
		reader, err := r.MultipartReader()
		if err != nil {
			http.Error(w, "expected multipart form upload", http.StatusBadRequest)
			return
		}

		var filename, contentType string
		var data []byte
		for {
			part, err := reader.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				var maxBytesErr *http.MaxBytesError
				if errors.As(err, &maxBytesErr) {
					http.Error(w, "file must be 100 MiB or smaller", http.StatusRequestEntityTooLarge)
					return
				}
				http.Error(w, "invalid upload", http.StatusBadRequest)
				return
			}
			if part.FormName() != "file" || part.FileName() == "" {
				part.Close()
				continue
			}
			if data != nil {
				http.Error(w, "only one file may be uploaded", http.StatusBadRequest)
				return
			}

			partFilename := safeFilename(part.FileName())
			partContentType := part.Header.Get("Content-Type")
			limited := io.LimitReader(part, maxFileSize+1)
			data, err = io.ReadAll(limited)
			part.Close()
			if err != nil {
				http.Error(w, "could not read uploaded file", http.StatusBadRequest)
				return
			}
			if int64(len(data)) > maxFileSize {
				http.Error(w, "file must be 100 MiB or smaller", http.StatusRequestEntityTooLarge)
				return
			}
			filename = partFilename
			contentType = partContentType
		}

		if data == nil || filename == "" {
			http.Error(w, "missing file", http.StatusBadRequest)
			return
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		info := s.SetFile(filename, contentType, data)
		broadcastFile(h, s)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(info)
	})

	mux.HandleFunc("GET /api/file", func(w http.ResponseWriter, r *http.Request) {
		info, data, ok := s.GetFile()
		if !ok {
			http.Error(w, "no file uploaded", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Length", strconv.FormatInt(info.Size, 10))
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": info.Name}))
		w.Write(data)
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
		fileData, _ := json.Marshal(map[string]any{"type": "file_updated", "file": s.GetFileInfo()})
		client.Send(fileData)

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

func broadcastFile(h *hub.Hub, s *store.Store) {
	data, _ := json.Marshal(map[string]any{"type": "file_updated", "file": s.GetFileInfo()})
	h.Broadcast(data)
}

func safeFilename(name string) string {
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.Map(func(r rune) rune {
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, name)
	if name == "" || name == "." {
		return "download"
	}
	return name
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
