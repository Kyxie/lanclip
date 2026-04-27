# ── Dev ───────────────────────────────────────────────────

# Start development environment (Hot-reload: Frontend 5173 | Backend 8080)
dev:
    docker compose -f docker-compose.dev.yml up -d
    @echo "🚀 Dev environment started in background!"
    @echo "🌍 Frontend: http://localhost:5173 | 🔌 Backend: http://localhost:8080"

# Stop development environment
dev-down:
    docker compose -f docker-compose.dev.yml down
    @echo "🛑 Dev environment stopped"

# View development logs (Usage: just logs [service_name])
logs service="":
    docker compose -f docker-compose.dev.yml logs -f {{service}}


# ── Prod ───────────────────────────────────────────────────

# Build production image
prod-build:
    @echo "📦 Building production image: lanclip..."
    docker build -t lanclip .

# Run production environment (Port 3000)
prod-run:
    docker compose up -d
    @echo "🚀 Production environment up! Access at: http://localhost:3000"

# Stop production environment
prod-stop:
    docker compose down
    @echo "🛑 Production environment stopped"


# ── Cleanup ──────────────────────────────────────────────────────────

# Remove all containers, volumes, and production images
clean:
    @echo "🧹 Cleaning dev containers and volumes..."
    docker compose -f docker-compose.dev.yml down -v
    @echo "🧹 Cleaning production containers..."
    docker compose down
    @echo "🗑️ Attempting to remove lanclip image..."
    -docker rmi lanclip 2>/dev/null
    @echo "✨ Cleanup complete!"