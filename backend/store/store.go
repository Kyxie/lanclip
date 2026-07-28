package store

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type Clip struct {
	ID        string    `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"createdAt"`
}

// FileInfo is the metadata for the one file shared by the service.
// The bytes themselves intentionally stay private to the in-memory store.
type FileInfo struct {
	Name        string    `json:"name"`
	Size        int64     `json:"size"`
	ContentType string    `json:"contentType"`
	CreatedAt   time.Time `json:"createdAt"`
}

type file struct {
	info FileInfo
	data []byte
}

type Store struct {
	mu         sync.RWMutex
	clips      []Clip
	maxHistory int
	file       *file
}

// SetFile atomically replaces the currently shared file. data is owned by the
// store after this call and must not be modified by the caller.
func (s *Store) SetFile(name, contentType string, data []byte) FileInfo {
	s.mu.Lock()
	defer s.mu.Unlock()

	info := FileInfo{
		Name:        name,
		Size:        int64(len(data)),
		ContentType: contentType,
		CreatedAt:   time.Now(),
	}
	s.file = &file{info: info, data: data}
	return info
}

func (s *Store) GetFileInfo() *FileInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.file == nil {
		return nil
	}
	info := s.file.info
	return &info
}

// GetFile returns immutable file data. A replacement always uses a new slice,
// so an in-flight download can safely continue with the previous file.
func (s *Store) GetFile() (FileInfo, []byte, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.file == nil {
		return FileInfo{}, nil, false
	}
	return s.file.info, s.file.data, true
}

func New(maxHistory int) *Store {
	return &Store{
		clips:      make([]Clip, 0),
		maxHistory: maxHistory,
	}
}

func (s *Store) Add(content string) []Clip {
	s.mu.Lock()
	defer s.mu.Unlock()

	b := make([]byte, 8)
	rand.Read(b)

	clip := Clip{
		ID:        hex.EncodeToString(b),
		Content:   content,
		CreatedAt: time.Now(),
	}

	s.clips = append([]Clip{clip}, s.clips...)
	if len(s.clips) > s.maxHistory {
		s.clips = s.clips[:s.maxHistory]
	}

	result := make([]Clip, len(s.clips))
	copy(result, s.clips)
	return result
}

func (s *Store) GetAll() []Clip {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Clip, len(s.clips))
	copy(result, s.clips)
	return result
}

// DeleteClip removes one clip by ID and returns the updated history.
func (s *Store) DeleteClip(id string) []Clip {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, clip := range s.clips {
		if clip.ID == id {
			s.clips = append(s.clips[:i], s.clips[i+1:]...)
			break
		}
	}
	result := make([]Clip, len(s.clips))
	copy(result, s.clips)
	return result
}

// ClearFile removes the currently shared file.
func (s *Store) ClearFile() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.file = nil
}
