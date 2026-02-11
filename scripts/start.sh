#!/bin/bash

# Complete build and start script for Vox Chat
# Handles frontend build and Docker Compose startup

set -e

echo "🚀 Vox Chat - Complete Build & Start"
echo "===================================="
echo ""

# Check prerequisites
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo "❌ Error: Docker Compose is not installed"
  exit 1
fi

# Ask for mode
echo "Select mode:"
echo "  1) Development (with frontend hot reload)"
echo "  2) Production (serves built frontend)"
echo ""
read -p "Enter choice (1 or 2): " -n 1 -r MODE
echo ""
echo ""

if [[ $MODE == "1" ]]; then
  # Development mode
  echo "📦 Development Mode"
  echo "==================="
  echo ""
  echo "Starting services with frontend dev server..."
  echo "  - Frontend: http://localhost:3000 (hot reload)"
  echo "  - Backend API: http://localhost:2052"
  echo ""
  
  # Check if frontend dependencies are installed
  if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
    echo ""
  fi
  
  # Start with dev profile
  docker compose -f docker-compose.dev.yml --profile dev up
  
elif [[ $MODE == "2" ]]; then
  # Production mode
  echo "🏭 Production Mode"
  echo "=================="
  echo ""
  
  # Check if frontend is built
  if [ ! -f "public/index.html" ]; then
    echo "⚠️  Frontend not built yet"
    echo ""
    read -p "Build frontend now? (y/n) " -n 1 -r BUILD
    echo ""
    
    if [[ $BUILD =~ ^[Yy]$ ]]; then
      echo "🔨 Building frontend..."
      echo ""
      
      # Check if Node.js is available
      if command -v node &> /dev/null; then
        cd frontend && npm install && npm run build && cd ..
      else
        echo "Node.js not found, using Docker build..."
        chmod +x scripts/docker-build-frontend.sh
        ./scripts/docker-build-frontend.sh
      fi
      
      echo ""
    else
      echo "❌ Cannot start without built frontend"
      echo "   Run: cd frontend && npm run build"
      exit 1
    fi
  else
    echo "✅ Frontend already built"
    echo ""
  fi
  
  echo "🚀 Starting production services..."
  echo "  - Application: http://localhost:2052"
  echo ""
  
  # Start production stack
  docker compose -f docker-compose.yml up -d
  
  echo ""
  echo "✅ Services started!"
  echo ""
  echo "View logs: docker compose logs -f"
  echo "Stop services: docker compose down"
  
else
  echo "❌ Invalid choice"
  exit 1
fi
