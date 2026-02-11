# Vox Chat - Deployment Guide

## Overview

Vox Chat now uses a modern Svelte frontend that builds into the `public/` directory, replacing the old HTML files.

## Architecture

```
vox-chat/
├── frontend/          # Svelte frontend source code
│   ├── src/
│   └── ...
├── public/            # ⚠️ Build output + user content (DO NOT DELETE)
│   ├── index.html     # Built Svelte app entry (generated)
│   ├── assets/        # JS, CSS bundles (generated)
│   ├── emojis/        # Custom emojis (preserved)
│   ├── plugins/       # Plugins (preserved)
│   ├── sounds/        # Sounds (preserved)
│   ├── img/           # Images (preserved)
│   └── uploads/       # User uploads (preserved)
├── index.mjs          # Backend server
└── docker-compose.yml
```

**Important:** The `public/` directory is essential:
- Frontend builds TO this directory
- Contains user-generated content
- Backend serves static files from here
- Docker mounts this directory

## Development Setup

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

Frontend development server with hot reload:

```bash
cd frontend
npm run dev
```

Visit: `http://localhost:3000`

The dev server proxies API and Socket.IO requests to `localhost:2052`.

### 3. Start Backend

In a separate terminal:

```bash
# Without Docker
npm start

# With Docker
docker-compose up
```

Backend runs on: `http://localhost:2052`

## Production Build

### 1. Build Frontend

```bash
cd frontend
npm run build
```

This compiles the Svelte app and outputs to `../public/`:
- `public/index.html` - Main HTML file
- `public/assets/*` - JavaScript and CSS bundles

### 2. Configure Backend

Update your Express server (`index.mjs` or similar) to serve the Svelte app:

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes (define these BEFORE the catch-all)
app.use('/api', apiRouter);

// Catch-all route - serve Svelte app for client-side routing
app.get('*', (req, res) => {
  // Skip API routes and socket.io
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return;
  }
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const PORT = process.env.PORT || 2052;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Start Production Server

```bash
npm start
# or
node index.mjs
```

Visit: `http://localhost:2052`

## Docker Deployment

### Build and Run

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d
```

### Important Notes

The `docker-compose.yml` mounts the `public/` directory, which includes:
- Svelte frontend build (index.html, assets/)
- User uploads (uploads/)
- Custom emojis (emojis/)

**Before deploying with Docker:**
1. Build the frontend: `cd frontend && npm run build`
2. Ensure `public/index.html` exists
3. Run `docker-compose up`

## CI/CD Pipeline

### Example GitHub Actions

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build frontend
        run: |
          cd frontend
          npm run build
      
      - name: Build Docker image
        run: docker-compose build
      
      - name: Deploy
        run: |
          # Your deployment script here
          docker-compose up -d
```

## Migration from Old HTML

### Clean Old Frontend Files

**Important:** Do NOT delete the `public/` directory! It contains user content and is where the build outputs.

Instead, clean out OLD HTML/JS/CSS files:

```bash
# Automated cleanup (recommended)
./scripts/clean-old-frontend.sh

# This removes:
# - Old HTML files (index.html, home.html, etc.)
# - Old JS/CSS directories (js/, css/)
# - Old page directories (settings/, testing/, etc.)
#
# While preserving:
# - emojis/
# - plugins/
# - sounds/
# - img/
# - uploads/
```

**Manual cleanup** (if needed):
```bash
# Backup first
mkdir -p public_backup
cp -r public/*.html public/*.css public/*.js public/js public/css public/settings public_backup/ 2>/dev/null || true

# Remove old frontend files
rm -f public/*.html public/*.css public/*.js
rm -rf public/js public/css public/settings public/serverlist public/testing public/voip public/webrtc

# Verify preserved directories
ls -la public/
# Should see: emojis/, plugins/, sounds/, img/, uploads/
```

### First Build

```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Verify build
ls -la public/index.html
ls -la public/assets/

# Test the app
npm start
# Visit http://localhost:2052
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=2052
NODE_ENV=production

# Database
DB_HOST=localhost
DB_USER=dcts
DB_PASS=dcts
DB_NAME=dcts

# LiveKit
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_KEY=change_me
LIVEKIT_SECRET=change_me

# JWT
JWT_SECRET=your-secret-key-here

# Optional
DEBUG=false
```

## File Structure After Build

```
public/
├── index.html              # ← Svelte app entry (built)
├── manifest.json           # ← PWA manifest (built)
├── assets/                 # ← Built JS/CSS (built)
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── uploads/                # ← User uploads (preserved)
├── emojis/                 # ← Custom emojis (preserved)
├── plugins/                # ← Plugins (preserved)
├── sounds/                 # ← Sound files (preserved)
└── img/                    # ← Images (preserved)
```

## Troubleshooting

### Build Issues

**Error: `npm run build` fails**
```bash
# Clean install
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error: Output directory issues**
```bash
# Check vite.config.js
# Ensure outDir is set to '../public'
```

### Runtime Issues

**404 on page refresh**
- Ensure catch-all route is configured in Express
- Check that `public/index.html` exists

**Static files not loading**
- Verify `express.static` middleware is configured
- Check file paths in browser network tab

**Socket.IO not connecting**
- Check CORS configuration
- Verify Socket.IO server is running
- Ensure port 2052 is accessible

### Docker Issues

**Frontend not showing**
```bash
# Build frontend before Docker
cd frontend && npm run build && cd ..

# Rebuild Docker containers
docker-compose down
docker-compose up --build
```

**Volume mount issues**
```bash
# Check docker-compose.yml volumes
# Ensure ./public:/app/public is present
```

## Performance Optimization

### Production Build Optimization

The Vite build is already optimized with:
- ✅ Code splitting
- ✅ Minification
- ✅ Tree shaking
- ✅ Asset optimization

### Additional Optimizations

**Enable gzip compression:**
```javascript
import compression from 'compression';
app.use(compression());
```

**Set cache headers:**
```javascript
app.use(express.static('public', {
  maxAge: '1y',
  etag: true
}));
```

**Use a CDN** for static assets if needed.

## Monitoring

### Health Checks

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
```

### Logging

```javascript
import morgan from 'morgan';
app.use(morgan('combined'));
```

## Rollback Procedure

If you need to rollback to old HTML files:

```bash
# Stop the server
docker-compose down

# Restore from backup
rm public/index.html
rm -rf public/assets
cp -r public_old/* public/

# Restart (with old HTML files)
docker-compose up -d
```

## Security Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure CORS properly
- [ ] Enable HTTPS in production
- [ ] Set secure headers (helmet.js)
- [ ] Validate all user inputs
- [ ] Rate limit API endpoints
- [ ] Keep dependencies updated

## Next Steps

1. ✅ Build frontend: `cd frontend && npm run build`
2. ✅ Update backend server file
3. ✅ Test locally
4. ✅ Deploy to staging
5. ✅ Test on staging
6. ✅ Deploy to production
7. ✅ Monitor for issues

---

**Need help?** See `frontend/INTEGRATION.md` for detailed backend integration guide.
