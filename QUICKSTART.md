# 🚀 Quick Start Guide

## What You Need
- Docker & Docker Compose
- (Optional) Node.js 18+ for local development

## 🎯 Choose Your Path

### Option 1: Production Mode (Recommended)
**Serves the built frontend from the backend**

```bash
# 1. Build the frontend
cd frontend
npm install
npm run build  # Outputs to ../public/

# 2. Start all services
cd ..
docker compose up -d

# 3. Visit http://localhost:2052
```

### Option 2: Development Mode  
**Frontend dev server with hot reload**

```bash
# Start all services including frontend dev server
docker compose -f docker-compose.dev.yml --profile dev up

# Frontend: http://localhost:3000 (hot reload)
# Backend: http://localhost:2052
```

### Option 3: Automated Start
**Let the script handle everything**

```bash
chmod +x scripts/start.sh
./scripts/start.sh

# Follow the prompts to choose dev or production mode
```

---

## 📁 Important Directories

```
vox-chat/
├── frontend/           # Svelte source code
│   ├── src/            # Components, pages, stores
│   └── vite.config.js  # Builds to ../public
│
├── public/             # ⚠️ CRITICAL - DO NOT DELETE
│   ├── index.html      # Built frontend entry (generated)
│   ├── assets/         # JS/CSS bundles (generated)
│   ├── emojis/         # User content (preserved)
│   ├── plugins/        # User content (preserved)
│   ├── sounds/         # User content (preserved)
│   ├── img/            # User content (preserved)
│   └── uploads/        # User content (preserved)
│
├── docker-compose.yml     # Production config
└── docker-compose.dev.yml # Development config
```

---

## 🔧 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend (dev) | 3000 | Svelte dev server with hot reload |
| Backend | 2052 | Express server + Socket.io |
| MariaDB | 3306 | Database |
| Redis | 6379 | Cache |
| LiveKit | 7880-7882 | Voice/Video server |

---

## 🌐 How Frontend Connects to Backend

### Development Mode (Port 3000)
The Vite dev server proxies API calls to backend:
- `/api/*` → `http://localhost:2052/api/*`
- `/socket.io/*` → `http://localhost:2052/socket.io/*`
- `/uploads/*` → `http://localhost:2052/uploads/*`

Configured in [frontend/vite.config.js](frontend/vite.config.js)

### Production Mode (Port 2052)
The Express backend serves the built frontend from `public/`:
- `/*` → `public/index.html` (Svelte app)
- `/api/*` → API routes
- `/socket.io/*` → WebSocket
- `/uploads/*` → User uploads

Configured in [index.mjs](index.mjs)

---

## 🛠️ Common Commands

```bash
# Build frontend only
cd frontend && npm run build

# Build frontend with Docker (no Node.js needed)
./scripts/docker-build-frontend.sh

# Start dev mode with hot reload
docker compose -f docker-compose.dev.yml --profile dev up

# Start production mode
docker compose up -d

# View logs
docker compose logs -f dcts-app

# Stop all services
docker compose down

# Clean old frontend files
./scripts/clean-old-frontend.sh

# Complete build & deploy
./scripts/build-and-deploy.sh
```

---

## 🐛 Troubleshooting

### Frontend not loading?
```bash
# Check if frontend is built
ls -la public/index.html public/assets/

# If missing, build it:
cd frontend && npm run build
```

### API calls failing?
```bash
# Check if backend is running
docker compose ps

# Check backend logs
docker compose logs dcts-app

# Verify ports are not in use
lsof -i :2052
lsof -i :3000
```

### Database connection errors?
```bash
# Check database health
docker compose ps dcts-mariadb

# Wait for healthcheck to pass
docker compose logs dcts-mariadb
```

---

## 📚 More Documentation

- [SVELTE_QUICKSTART.md](SVELTE_QUICKSTART.md) - Frontend development guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [frontend/README.md](frontend/README.md) - Frontend architecture
- [public/README.md](public/README.md) - Public directory info

---

## 🔥 Quick Reference

**Just want to get started FAST?**

```bash
# The fastest way (automated):
chmod +x scripts/start.sh && ./scripts/start.sh

# Or manually:
cd frontend && npm install && npm run build && cd ..
docker compose up -d
```

Visit **http://localhost:2052** and you're good to go! 🎉
