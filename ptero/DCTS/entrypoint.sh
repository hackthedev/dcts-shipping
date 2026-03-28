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
fi

bun --version

if [ -f "package.json" ]; then
  bun install --ignore-scripts --frozen-lockfile || bun install --ignore-scripts
fi

# ==========================================
# LIVEKIT INTEGRATION
# ==========================================
export LIVEKIT_YAML_PATH="livekit/livekit.yaml"

# auto-download livekit binary if missing (e.g. first start after clone wiped it)
if [ ! -f "livekit/livekit-server" ]; then
    echo "LiveKit binary not found. Downloading..."
    mkdir -p livekit

    LIVEKIT_VERSION=$(curl -s https://api.github.com/repos/livekit/livekit/releases/latest | grep '"tag_name":' | head -n 1 | sed -E 's/.*"v([^"]+)".*/\1/')
    if [ -z "$LIVEKIT_VERSION" ]; then
        LIVEKIT_VERSION="1.10.0"
        echo "Could not fetch latest version (API rate limit?), falling back to v${LIVEKIT_VERSION}"
    fi

    DOWNLOAD_URL="https://github.com/livekit/livekit/releases/latest/download/livekit_${LIVEKIT_VERSION}_linux_amd64.tar.gz"
    echo "Downloading LiveKit v${LIVEKIT_VERSION}..."

    if curl -sfL "${DOWNLOAD_URL}" -o /tmp/livekit.tar.gz && tar -xzf /tmp/livekit.tar.gz -C livekit livekit-server; then
        chmod +x livekit/livekit-server
        rm -f /tmp/livekit.tar.gz
        echo "LiveKit v${LIVEKIT_VERSION} installed."
    else
        rm -f /tmp/livekit.tar.gz
        echo "Warning: Failed to download LiveKit from ${DOWNLOAD_URL}"
    fi
fi

if [ -f "livekit/livekit-server" ]; then
    echo "LiveKit binary found. Setting up embedded LiveKit Server..."

    # generate keys if they don't exist in our environment yet
    if ! grep -q "^LIVEKIT_API_KEY=" .env 2>/dev/null; then
        echo "Generating new LiveKit keys (overriding github template)..."
        OUTPUT=$(./livekit/livekit-server generate-keys)
        API_KEY=$(echo "$OUTPUT" | awk '/API Key:/ {print $3}')
        API_SECRET=$(echo "$OUTPUT" | awk '/API Secret:/ {print $3}')

        touch "${LIVEKIT_YAML_PATH}"
        /usr/local/bin/yq -i '
          .keys = {} |
          .keys["'"$API_KEY"'"] = "'"$API_SECRET"'"
        ' "${LIVEKIT_YAML_PATH}"
        echo "LiveKit Keys generated and template overridden."
    fi

    echo "Syncing LiveKit Ports..."

    if [ -n "$LIVEKIT_PORT" ]; then
        /usr/local/bin/yq -i '.port = '"$LIVEKIT_PORT" "${LIVEKIT_YAML_PATH}"
    fi
    if [ -n "$RTC_TCP_PORT" ]; then
        /usr/local/bin/yq -i '.rtc.tcp_port = '"$RTC_TCP_PORT" "${LIVEKIT_YAML_PATH}"
    fi
    if [ -n "$RTC_UDP_PORT" ]; then
        /usr/local/bin/yq -i '.rtc.udp_port = '"$RTC_UDP_PORT" "${LIVEKIT_YAML_PATH}"
    fi

    echo "Reading LiveKit Keys to sync with DCTS .env..."
    API_KEY=$(/usr/local/bin/yq '.keys | keys | .[0]' "${LIVEKIT_YAML_PATH}")
    API_SECRET=$(/usr/local/bin/yq '.keys | .["'"$API_KEY"'"]' "${LIVEKIT_YAML_PATH}")

    touch .env
    # remove old keys if present
    sed -i '/^LIVEKIT_API_KEY=/d' .env
    sed -i '/^LIVEKIT_API_SECRET=/d' .env

    # inject keys into .env and export them so they override pterodactyl's native variables
    echo "LIVEKIT_API_KEY=${API_KEY}" >> .env
    echo "LIVEKIT_API_SECRET=${API_SECRET}" >> .env
    export LIVEKIT_API_KEY="${API_KEY}"
    export LIVEKIT_API_SECRET="${API_SECRET}"

    # fully automate LIVEKIT_URL using wildcard domain
    if [ -n "$LIVEKIT_PORT" ]; then
        sed -i '/^LIVEKIT_URL=/d' .env
        echo "LIVEKIT_URL=${LIVEKIT_PORT}.instance.dcts.community" >> .env
        export LIVEKIT_URL="${LIVEKIT_PORT}.instance.dcts.community"
        echo "Injected LIVEKIT_URL into .env and environment: ${LIVEKIT_PORT}.instance.dcts.community"
    fi

    echo "Starting LiveKit server silently in the background..."
    env -u REDIS_HOST ./livekit/livekit-server --config "${LIVEKIT_YAML_PATH}" >/dev/null 2>&1 &
else
    echo "Warning: LiveKit binary not available. Running purely as chat server."
fi
# ==========================================

MODIFIED_STARTUP=$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')
MODIFIED_STARTUP=$(eval "echo \"$MODIFIED_STARTUP\"")

echo ":/home/container$ ${MODIFIED_STARTUP}"
exec bash -lc "${MODIFIED_STARTUP}"