#!/bin/bash
cd /home/container

bun --version

if [ -f "package.json" ]; then
  bun install --ignore-scripts --frozen-lockfile 2>/dev/null || bun install --ignore-scripts
fi

MODIFIED_STARTUP=$(eval echo $(echo ${STARTUP} | sed -e 's/{{/${/g' -e 's/}}/}/g'))
echo ":/home/container$ ${MODIFIED_STARTUP}"

exec ${MODIFIED_STARTUP}