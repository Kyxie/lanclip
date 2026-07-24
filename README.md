LANCLIP

A simple LAN clipboard-style notification app.

## Overview

This project lets users submit short text clips and receive real-time updates through WebSocket broadcasts.

## Tech Stack

- Backend: Go (net/http + Gorilla WebSocket)
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Deployment: Docker and Docker Compose

## Features

- Add a new clip with `POST /api/clips`
- Read current clips with `GET /api/clips`
- Get app config with `GET /api/config`
- Receive live clip updates via `/ws`
- Configurable clip history size through `MAX_HISTORY`
- Drag one file (up to 100 MiB) into the editor to share it with connected clients

## Quick Start

### Production (Docker)

```bash
docker compose up -d
```

Open: http://localhost:3000

### Development (recommended with just)

```bash
just dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:8080

Stop dev environment:

```bash
just dev-down
```

## Environment Variables

- `PORT` (default: `3000`)
- `MAX_HISTORY` (default: `5`)

## File sharing

The most recently uploaded file is stored in memory and replaces the previous
one. It is available to all connected clients until the service restarts; files
are not persisted to disk.

## Project Structure

- `backend/` Go backend service
- `frontend/` React frontend
- `docker-compose.dev.yml` Dev environment
- `docker-compose.yml` Production environment

## License

MIT
