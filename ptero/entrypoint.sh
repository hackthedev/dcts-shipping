#!/bin/bash
cd /home/container

if [ -d ".git" ]; then
  echo "Checking for updates from beta-ptero..."
  git stash # Stash any uncommitted local changes just in case to prevent merge conflicts
  git pull origin beta-ptero || true
fi

bun --version

if [ -f "package.json" ]; then
  bun install --ignore-scripts --frozen-lockfile 2>/dev/null || bun install --ignore-scripts
fi

MODIFIED_STARTUP=$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')
MODIFIED_STARTUP=$(eval "echo \"$MODIFIED_STARTUP\"")

echo ":/home/container$ ${MODIFIED_STARTUP}"
exec bash -lc "${MODIFIED_STARTUP}"