# Vox Chat - Command Reference

Quick reference for common tasks with the new Svelte frontend.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Start development
npm run dev
# Visit http://localhost:3000

# 3. Build for production
npm run build

# 4. Start backend
cd .. && npm start
# Visit http://localhost:2052
```

---

## 📦 Frontend Commands

```bash
cd frontend

# Development
npm run dev              # Start dev server with hot reload (port 3000)
npm run build            # Build for production
npm run preview          # Preview production build
npm run check            # Run Svelte type checking

# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 🏗️ Build & Deploy

```bash
# Automated build and deploy
./scripts/build-and-deploy.sh

# Manual process
cd frontend
npm install
npm run build
cd ..
npm start

# Docker
docker-compose up --build
docker-compose up -d              # Run in background
docker-compose down               # Stop containers
docker-compose logs -f dcts-app   # View logs
```

---

## 💾 Clean & Backup

```bash
# Clean old HTML/JS/CSS files (RECOMMENDED before first build)
./scripts/clean-old-frontend.sh

# This removes OLD frontend files while preserving user content:
# Removes: *.html, js/, css/, settings/, testing/, etc.
# Keeps: emojis/, plugins/, sounds/, img/, uploads/

# Restore if needed
mv public_backup_*/* public/

# Check current public/ contents
ls -la public/
```

## ⚠️ Important: Do NOT Delete public/

```bash
# ❌ WRONG - Don't do this!
rm -rf public/

# ✅ RIGHT - Clean old files, keep directory
./scripts/clean-old-frontend.sh

# The public/ directory is essential because:
# 1. Frontend builds TO this directory
# 2. Contains user uploads and content
# 3. Backend serves static files from here
```

---

## 🔍 Verification

```bash
# Check frontend build output
ls -lh public/index.html
ls -lh public/assets/

# Check file sizes
du -h public/assets/*.js
du -h public/assets/*.css

# Test frontend dev server
cd frontend && npm run dev
# Visit http://localhost:3000

# Test production build
npm start
# Visit http://localhost:2052
```

---

## 🐛 Troubleshooting

```bash
# Clean rebuild
cd frontend
rm -rf node_modules package-lock.json dist
npm install
npm run build

# Check for errors
npm run check

# View detailed build output
npm run build -- --debug

# Clear browser cache
# Chrome: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
```

---

## 📝 Development Workflow

```bash
# 1. Make changes in frontend/src/
# 2. Check dev server automatically reloads
# 3. Test in browser at localhost:3000
# 4. Build when ready
cd frontend && npm run build

# 5. Test production build
cd .. && npm start
```

---

## 🔧 Configuration Files

```bash
# Frontend configuration
frontend/vite.config.js          # Vite build config
frontend/svelte.config.js        # Svelte config
frontend/package.json            # Dependencies & scripts
frontend/jsconfig.json           # JavaScript/TypeScript config

# Backend configuration
index.mjs                        # Main server file (needs update)
docker-compose.yml               # Docker configuration
.env                             # Environment variables

# Build output
public/index.html                # Built app entry
public/assets/                   # JS/CSS bundles
public/.gitignore                # Ignore build files
```

---

## 📂 File Structure Reference

```
vox-chat/
├── frontend/               # Svelte source code
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── layouts/        # Layout wrappers
│   │   ├── lib/            # Stores & services
│   │   ├── app.css         # Global styles
│   │   ├── App.svelte      # Root component
│   │   └── main.js         # Entry point
│   ├── index.html          # HTML template
│   ├── vite.config.js      # Build config
│   └── package.json        # Dependencies
│
├── public/                 # Build output & static
│   ├── index.html          # Built (generated)
│   ├── assets/             # Built (generated)
│   ├── uploads/            # User content
│   ├── emojis/             # Custom emojis
│   └── .gitignore          # Ignore builds
│
├── scripts/                # Deployment scripts
│   ├── backup-old-html.sh
│   └── build-and-deploy.sh
│
├── docs/                   # Documentation
│   ├── README.md
│   ├── SVELTE_QUICKSTART.md
│   ├── DEPLOYMENT.md
│   └── MIGRATION_SUMMARY.md
│
└── index.mjs               # Backend server
```

---

## 🌐 URLs

| Service | Development | Production |
|---------|-------------|------------|
| **Frontend Dev** | http://localhost:3000 | N/A |
| **Backend API** | http://localhost:2052 | http://your-domain.com |
| **Socket.IO** | ws://localhost:2052 | wss://your-domain.com |

---

## 🔑 Environment Variables

```bash
# Backend (.env file)
PORT=2052
NODE_ENV=production
DB_HOST=localhost
DB_USER=dcts
DB_PASS=dcts
DB_NAME=dcts
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_KEY=change_me
LIVEKIT_SECRET=change_me
JWT_SECRET=your-secret-here
```

---

## 📊 Health Checks

```bash
# Check if build exists
test -f public/index.html && echo "✅ Build exists" || echo "❌ Build missing"

# Check backend is running
curl http://localhost:2052/health || echo "Backend not running"

# Check file sizes
du -sh public/assets

# Check Node.js version
node --version  # Should be 18+
```

---

## 🔄 Git Workflow

```bash
# Current branch
git branch

# Status
git status

# Stage changes (excluding build output)
git add frontend/
git add scripts/
git add *.md

# Commit
git commit -m "Add Svelte frontend"

# Push
git push origin your-branch

# Note: Build output in public/ is gitignored automatically
```

---

## 📚 Documentation Quick Links

- **[SVELTE_QUICKSTART.md](SVELTE_QUICKSTART.md)** - Start here
- **[frontend/README.md](frontend/README.md)** - Complete frontend docs
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide
- **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - What changed
- **[frontend/INTEGRATION.md](frontend/INTEGRATION.md)** - Backend integration

---

## 🆘 Common Issues

### Build fails
```bash
cd frontend
rm -rf node_modules
npm install
npm run build
```

### Port already in use
```bash
# Find process using port
lsof -i :3000  # or :2052
# Kill process
kill -9 <PID>
```

### Module not found
```bash
cd frontend
npm install
```

### Permission denied
```bash
chmod +x scripts/*.sh
```

---

## ✅ Pre-Deploy Checklist

- [ ] `cd frontend && npm install` completed
- [ ] `npm run build` successful
- [ ] `public/index.html` exists
- [ ] `public/assets/` contains JS/CSS files
- [ ] Backend server updated (see DEPLOYMENT.md)
- [ ] Environment variables configured
- [ ] Old HTML files backed up (optional)
- [ ] Test locally (`npm start`)
- [ ] Docker build works (`docker-compose up --build`)

---

## 🎯 One-Command Deploy

```bash
./scripts/build-and-deploy.sh && npm start
```

That's it! 🚀

---

**For detailed information, see [DEPLOYMENT.md](DEPLOYMENT.md)**
