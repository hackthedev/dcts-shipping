#!/bin/bash

# Clean old HTML/JS/CSS files from public/ directory
# Preserves user content and prepares for Svelte build

set -e

echo "🧹 Cleaning old frontend files from public/..."
echo ""

# Create backup directory with timestamp
BACKUP_DIR="public_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up old files to: $BACKUP_DIR"
echo ""

# Files and directories to remove/backup (OLD frontend code)
OLD_FILES=(
  "public/index.html"
  "public/home.html"
  "public/voip.html"
  "public/style.css"
  "public/highlight.css"
  "public/chat.js"
  "public/notify.js"
  "public/service-worker.js"
  "public/manifest.json"
)

OLD_DIRS=(
  "public/css"
  "public/js"
  "public/settings"
  "public/serverlist"
  "public/testing"
  "public/voip"
  "public/webrtc"
  "public/audioplayer"
  "public/.idea"
)

# Backup and remove old files
echo "🗑️  Removing old HTML/JS/CSS files..."
for file in "${OLD_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ Backing up: $file"
    cp "$file" "$BACKUP_DIR/"
    rm "$file"
  fi
done

echo ""
echo "🗑️  Removing old directories..."
for dir in "${OLD_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✓ Backing up: $dir"
    cp -r "$dir" "$BACKUP_DIR/"
    rm -rf "$dir"
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📁 PRESERVED directories in public/:"
ls -d public/*/ 2>/dev/null | while read dir; do
  echo "  ✓ $(basename "$dir")"
done

echo ""
echo "🎯 Next steps:"
echo "  1. cd frontend"
echo "  2. npm install"
echo "  3. npm run build  (creates new index.html and assets/)"
echo "  4. Test: npm start"
echo ""
echo "💾 Backup saved to: $BACKUP_DIR"
echo "   To restore: mv $BACKUP_DIR/* public/"
