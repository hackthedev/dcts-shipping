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

# ==========================================
# LIVEKIT INTEGRATION
# ==========================================
export LIVEKIT_YAML_PATH="Livekit/livekit.yaml"

if [ -f "Livekit/livekit-server" ]; then
    echo "LiveKit binary found. Setting up embedded LiveKit Server..."
    
    # Generate keys if they don't exist
    if ! grep -q "^keys:" "${LIVEKIT_YAML_PATH}" 2>/dev/null; then
        echo "Generating new LiveKit keys..."
        OUTPUT=$(./Livekit/livekit-server generate-keys)
        API_KEY=$(echo "$OUTPUT" | awk '/API Key:/ {print $3}')
        API_SECRET=$(echo "$OUTPUT" | awk '/API Secret:/ {print $3}')

        touch "${LIVEKIT_YAML_PATH}"
        /usr/local/bin/yq -i '
          .keys = {} |
          .keys["'"$API_KEY"'"] = "'"$API_SECRET"'"
        ' "${LIVEKIT_YAML_PATH}"
        echo "LiveKit Keys generated."
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
    API_KEY=$(/usr/local/bin/yq e '.keys | keys | .[0]' "${LIVEKIT_YAML_PATH}")
    API_SECRET=$(/usr/local/bin/yq e '.keys | .["'"$API_KEY"'"]' "${LIVEKIT_YAML_PATH}")

    touch .env
    # Remove old keys if present
    sed -i '/^LIVEKIT_API_KEY=/d' .env
    sed -i '/^LIVEKIT_API_SECRET=/d' .env
    
    # Inject keys into .env
    echo "LIVEKIT_API_KEY=${API_KEY}" >> .env
    echo "LIVEKIT_API_SECRET=${API_SECRET}" >> .env

    echo "Starting LiveKit server in the background..."
    ./Livekit/livekit-server --config "${LIVEKIT_YAML_PATH}" &
else
    echo "Notice: LiveKit binary not found. Running purely as chat server."
fi
# ==========================================

MODIFIED_STARTUP=$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')
MODIFIED_STARTUP=$(eval "echo \"$MODIFIED_STARTUP\"")

echo ":/home/container$ ${MODIFIED_STARTUP}"
exec bash -lc "${MODIFIED_STARTUP}"