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
  git clean -fd -e livekit/livekit-server
fi

bun --version

if [ -f "package.json" ]; then
  bun install --ignore-scripts --frozen-lockfile || bun install --ignore-scripts
fi

# ==========================================
# LIVEKIT INTEGRATION
# ==========================================
export LIVEKIT_YAML_PATH="livekit/livekit.yaml"

if [ -f "livekit/livekit-server" ]; then
    echo "LiveKit binary found. Setting up embedded LiveKit Server..."
    
    # Generate keys if they don't exist in our environment yet
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

    # Auto-detect Pterodactyl Allocations if variables are missing or default
    if [ -z "$LIVEKIT_PORT" ] || [ "$LIVEKIT_PORT" == "7880" ]; then
        if [ -n "$P_SERVER_ALLOCATION_1" ]; then
            export LIVEKIT_PORT="$P_SERVER_ALLOCATION_1"
        fi
    fi
    if [ -z "$RTC_TCP_PORT" ] || [ "$RTC_TCP_PORT" == "7881" ]; then
        if [ -n "$P_SERVER_ALLOCATION_2" ]; then
            export RTC_TCP_PORT="$P_SERVER_ALLOCATION_2"
        fi
    fi
    if [ -z "$RTC_UDP_PORT" ] || [ "$RTC_UDP_PORT" == "7882" ]; then
        if [ -n "$P_SERVER_ALLOCATION_3" ]; then
            export RTC_UDP_PORT="$P_SERVER_ALLOCATION_3"
        fi
    fi

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
    # Remove old keys if present
    sed -i '/^LIVEKIT_API_KEY=/d' .env
    sed -i '/^LIVEKIT_API_SECRET=/d' .env
    
    # Inject keys into .env
    echo "LIVEKIT_API_KEY=${API_KEY}" >> .env
    echo "LIVEKIT_API_SECRET=${API_SECRET}" >> .env
    
    # Fully Automate LIVEKIT_URL using your Wildcard Domain
    if [ -n "$LIVEKIT_PORT" ]; then
        sed -i '/^LIVEKIT_URL=/d' .env
        echo "LIVEKIT_URL=wss://${LIVEKIT_PORT}.instance.dcts.community" >> .env
        echo "Injected LIVEKIT_URL into .env: wss://${LIVEKIT_PORT}.instance.dcts.community"
    fi

    echo "Starting LiveKit server silently in the background..."
    env -u REDIS_HOST ./livekit/livekit-server --config "${LIVEKIT_YAML_PATH}" >/dev/null 2>&1 &
else
    echo "Notice: LiveKit binary not found. Running purely as chat server."
fi
# ==========================================

MODIFIED_STARTUP=$(echo "${STARTUP}" | sed -e 's/{{/${/g' -e 's/}}/}/g')
MODIFIED_STARTUP=$(eval "echo \"$MODIFIED_STARTUP\"")

echo ":/home/container$ ${MODIFIED_STARTUP}"
exec bash -lc "${MODIFIED_STARTUP}"