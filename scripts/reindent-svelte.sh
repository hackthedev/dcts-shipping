#!/bin/bash

# Convert all Svelte files from 2-space to 4-space indentation

set -e

echo "🔧 Converting Svelte files from 2-space to 4-space indentation..."
echo ""

# Find all .svelte files in frontend/src
SVELTE_FILES=$(find frontend/src -name "*.svelte" -type f)

# Count total files
TOTAL=$(echo "$SVELTE_FILES" | wc -l | xargs)

echo "📁 Found $TOTAL Svelte files"
echo ""

# Counter
COUNT=0

# Process each file
for file in $SVELTE_FILES; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Processing: $file"
  
  # Create a temporary file
  TMPFILE="${file}.tmp"
  
  # Convert 2-space indentation to 4-space
  # This uses unexpand to convert spaces to tabs, then expand to convert back with 4 spaces
  unexpand -t 2 "$file" | expand -t 4 > "$TMPFILE"
  
  # Replace original file
  mv "$TMPFILE" "$file"
done

echo ""
echo "✅ Done! All $TOTAL files have been re-indented."
echo ""
echo "🔍 Next steps:"
echo "   1. Review changes: git diff frontend/src/"
echo "   2. Test the build: cd frontend && npm run build"
echo "   3. Commit changes: git add frontend/src && git commit -m 'chore: convert to 4-space indentation'"
echo ""
