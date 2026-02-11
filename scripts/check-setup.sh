#!/bin/bash
# Quick check of the Vox Chat setup

echo "🔍 Vox Chat Setup Status"
echo "========================"
echo ""

# Check if frontend is built
echo "📦 Frontend Build Status:"
if [ -f "public/index.html" ]; then
  echo "   ✅ Frontend is built"
  echo "      - index.html: $(ls -lh public/index.html | awk '{print $5}')"
  echo "      - Assets: $(ls -1 public/assets/*.js 2>/dev/null | wc -l | xargs) JS files"
else
  echo "   ❌ Frontend NOT built"
  echo "      Run: cd frontend && npm run build"
fi

echo ""

# Check Docker
echo "🐳 Docker Status:"
if command -v docker &> /dev/null; then
  echo "   ✅ Docker installed"
  if docker compose version &> /dev/null 2>&1; then
    echo "   ✅ Docker Compose available"
  else
    echo "   ⚠️  Docker Compose not found"
  fi
else
  echo "   ❌ Docker not installed"
fi

echo ""

# Check if services are running
echo "🚀 Running Services:"
if docker compose ps --format json 2>/dev/null | grep -q "running"; then
  echo "   ✅ Services are running:"
  docker compose ps --format "table {{.Service}}\t{{.Status}}" 2>/dev/null || true
else
  echo "   ℹ️  No services currently running"
  echo "      Start with: docker compose up -d"
fi

echo ""

# Check Node.js
echo "📦 Development Tools:"
if command -v node &> /dev/null; then
  echo "   ✅ Node.js $(node --version)"
  echo "   ✅ npm $(npm --version)"
else
  echo "   ℹ️  Node.js not installed (optional for Docker builds)"
fi

echo ""

# Check directories
echo "📁 Directory Status:"
[ -d "public" ] && echo "   ✅ public/" || echo "   ❌ public/ missing"
[ -d "frontend" ] && echo "   ✅ frontend/" || echo "   ❌ frontend/ missing"
[ -d "frontend/src" ] && echo "   ✅ frontend/src/" || echo "   ⚠️  frontend/src/ missing"

echo ""

# Quick start commands
echo "🎯 Quick Start Commands:"
echo ""
echo "   Production (recommended):"
echo "     cd frontend && npm run build && cd .."
echo "     docker compose up -d"
echo ""
echo "   Development (with hot reload):"
echo "     docker compose -f docker-compose.dev.yml --profile dev up"
echo ""
echo "   Or use the automated script:"
echo "     ./scripts/start.sh"
echo ""

# Endpoints
if docker compose ps --format json 2>/dev/null | grep -q "running"; then
  echo "🌐 Available Endpoints:"
  echo "   • Application: http://localhost:2052"
  echo "   • Database: localhost:3306 (dcts/dcts)"
  echo "   • Redis: localhost:6379"
  echo "   • LiveKit: localhost:7880"
  echo ""
fi

echo "📚 Documentation:"
echo "   • QUICKSTART.md - Fast setup guide"
echo "   • SVELTE_QUICKSTART.md - Frontend development"
echo "   • DEPLOYMENT.md - Full deployment guide"
echo "   • frontend/README.md - Frontend architecture"
echo ""
