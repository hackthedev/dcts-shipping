#!/bin/bash
set -e

cd /home/container

REPO_URL="${GIT_REPO:-https://github.com/hackthedev/dcts-shipping.git}"
REPO_BRANCH="${GIT_BRANCH:-beta}"

if [ ! -d ".git" ]; then
  echo "No git repo found, cloning ${REPO_BRANCH}..."
  rm -rf /home/container/*
  git clone --branch "${REPO_BRANCH}" --single-branch "${REPO_URL}" /home/container
else
  echo "Updating repository..."
  git fetch origin "${REPO_BRANCH}"
  git checkout "${REPO_BRANCH}" || git checkout -b "${REPO_BRANCH}" "origin/${REPO_BRANCH}"
  git reset --hard "origin/${REPO_BRANCH}"
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