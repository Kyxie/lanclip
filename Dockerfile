# ── Stage 1: build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: build backend ───────────────────────────────────────────────────
FROM golang:1.25-alpine AS backend-builder
WORKDIR /app
COPY backend/ ./
# Copy built frontend into the embed path expected by //go:embed static
COPY --from=frontend-builder /app/dist ./static
RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o lanclip .

# ── Stage 3: minimal runtime image ───────────────────────────────────────────
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY --from=backend-builder /app/lanclip .
EXPOSE 3000
ENV MAX_HISTORY=5
CMD ["./lanclip"]
