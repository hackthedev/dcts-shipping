#!/bin/bash

# Backup old HTML files before cleaning
# This script creates a backup without removing files
# Use clean-old-frontend.sh to backup AND remove

set -e

echo "📦 Creating backup of old frontend files..."

# Create backup directory with timestamp
BACKUP_DIR="public_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Files and directories to backup
ITEMS_TO_BACKUP=(
  "public/*.html"
  "public/*.css"
  "public/*.js"
  "public/js"
  "public/css"
  "public/settings"
  "public/serverlist"
  "public/testing"
  "public/voip"
  "public/webrtc"
  "public/audioplayer"
)

# Copy items to backup
for item in "${ITEMS_TO_BACKUP[@]}"; do
  if compgen -G "$item" > /dev/null 2>&1; then
    echo "  ✓ Backing up: $item"
    cp -r $item "$BACKUP_DIR/" 2>/dev/null || true
  fi
done

echo ""
echo "✅ Backup complete: $BACKUP_DIR"
echo ""
echo "📁 Preserved in public/ (not backed up):"
ls -d public/emojis public/plugins public/sounds public/img public/uploads 2>/dev/null || echo "  (user content directories)"
echo ""
echo "🎯 Next steps:"
echo "  Option 1: Use clean-old-frontend.sh to remove old files"
echo "  Option 2: Manually remove old files and build frontend"
echo ""
echo "💡 To restore from backup:"
echo "  cp -r $BACKUP_DIR/* public/"
