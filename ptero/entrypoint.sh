#!/bin/bash
set -e

cd /home/container

REPO_URL="${GIT_REPO:-https://github.com/hackthedev/dcts-shipping.git}"
REPO_BRANCH="${GIT_BRANCH:-beta}"

if [ ! -d ".git" ]; then
  echo "Force cloning repo..."
  rm -rf /home/container/* /home/container/.[!.]* 2>/dev/null || true
  git clone --branch "${GIT_BRANCH:-beta}" "${GIT_REPO:-https://github.com/hackthedev/dcts-shipping.git}" /home/container
else
  git fetch origin "${GIT_BRANCH:-beta}"
  git reset --hard "origin/${GIT_BRANCH:-beta}"
  git clean -fd
fi

bun --version

if [ -f "package.json" ]; then
  bun install --ignore-scripts --frozen-lockfile || bun install --ignore-scripts
fi

MODIFIED_STARTUP=$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')
MODIFIED_STARTUP=$(eval "echo \"$MODIFIED_STARTUP\"")

echo ":/home/container$ ${MODIFIED_STARTUP}"
exec bash -lc "${MODIFIED_STARTUP}"