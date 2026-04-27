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

type Store struct {
	mu         sync.RWMutex
	clips      []Clip
	maxHistory int
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
