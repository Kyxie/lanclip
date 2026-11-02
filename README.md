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

## Release

After committing your changes, run `just release` to push the current branch and create the next patch tag. Use `just release minor` or `just release major` to increase the middle or first version number. For example, starting at `v1.0.10`, these produce `v1.0.11`, `v1.1.0`, or `v2.0.0` respectively.

The command requires a clean working tree and an up-to-date branch. It pushes the commit and tag together, which triggers the Docker image build. You can also choose **Run workflow** in GitHub Actions and select patch, minor, or major.

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
