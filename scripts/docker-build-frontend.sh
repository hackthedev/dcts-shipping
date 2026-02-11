#!/bin/bash

# Build frontend using Docker
# Useful for CI/CD or when you don't have Node.js installed locally

set -e

echo "🐳 Building Vox Chat frontend with Docker..."
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker is not installed"
  exit 1
fi

# Build the frontend image
echo "📦 Building Docker image..."
docker build -t vox-chat-frontend-builder ./frontend

# Create a temporary container to extract build output
echo "📤 Extracting build artifacts..."
CONTAINER_ID=$(docker create vox-chat-frontend-builder)

# Copy the built files to public/
docker cp "$CONTAINER_ID:/output/." ./public/

# Clean up
docker rm "$CONTAINER_ID"

echo ""
echo "✅ Frontend built successfully!"
echo ""
echo "📁 Build output in public/:"
ls -lh public/index.html 2>/dev/null && echo "   ✓ index.html" || echo "   ✗ index.html missing"
ls -d public/assets 2>/dev/null && echo "   ✓ assets/" || echo "   ✗ assets/ missing"
echo ""
echo "🚀 Ready to deploy with docker-compose up"
