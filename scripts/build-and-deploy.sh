#!/bin/bash

# Build and deploy Vox Chat with Svelte frontend
# This script builds the frontend and prepares for deployment

set -e

echo "🚀 Building Vox Chat..."
echo ""

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
  echo "❌ Error: frontend/ directory not found"
  echo "   Run this script from the project root"
  exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed"
  echo "   Install Node.js 18+ from https://nodejs.org/"
  exit 1
fi

echo "📦 Installing frontend dependencies..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  npm install
else
  echo "   Dependencies already installed"
fi

echo ""
echo "🔨 Building frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

cd ..

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Build output:"
ls -lh public/index.html 2>/dev/null || echo "   ⚠️  Warning: public/index.html not found"
ls -lh public/assets/*.js 2>/dev/null | head -3 || echo "   ⚠️  Warning: No JS bundles found"
echo ""

# Check if index.html exists
if [ ! -f "public/index.html" ]; then
  echo "❌ Error: Build succeeded but public/index.html not found"
  echo "   Check vite.config.js settings"
  exit 1
fi

echo "✅ Deployment ready!"
echo ""
echo "🎯 Next steps:"
echo ""
echo "  Local development:"
echo "    npm start"
echo "    Visit http://localhost:2052"
echo ""
echo "  Docker deployment:"
echo "    docker-compose up --build"
echo ""
echo "  Production deployment:"
echo "    1. Ensure environment variables are set (.env)"
echo "    2. Configure reverse proxy (nginx, etc.)"
echo "    3. Enable HTTPS"
echo "    4. Start the server"
echo ""

# Optional: Ask if user wants to start the server
read -p "Start the server now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🚀 Starting server..."
  npm start
fi
