#!/bin/bash
cd /home/container

# output current bun version
bun --version

# install dependencies if package.json exists
if [ -f "package.json" ]; then
  bun install --frozen-lockfile 2>/dev/null || bun install
fi

# replace startup variables
MODIFIED_STARTUP=`eval echo $(echo ${STARTUP} | sed -e 's/{{/${/g' -e 's/}}/}/g')`
echo ":/home/container$ ${MODIFIED_STARTUP}"

# run the server
${MODIFIED_STARTUP}