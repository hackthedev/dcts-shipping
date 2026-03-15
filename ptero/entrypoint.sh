#!/bin/bash
cd /home/container

bun --version

if [ -f "package.json" ]; then
  bun install --ignore-scripts --frozen-lockfile 2>/dev/null || bun install --ignore-scripts
fi

MODIFIED_STARTUP=$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')
MODIFIED_STARTUP=$(eval "echo \"$MODIFIED_STARTUP\"")

echo ":/home/container$ ${MODIFIED_STARTUP}"
exec bash -lc "${MODIFIED_STARTUP}"

exec ${MODIFIED_STARTUP}