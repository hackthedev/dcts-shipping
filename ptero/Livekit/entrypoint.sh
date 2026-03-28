#!/bin/bash
set -e

cd /home/container

export LIVEKIT_YAML_PATH="${LIVEKIT_YAML_PATH:-livekit.yaml}"

if [ ! -f "livekit-server" ]; then
    echo "ERROR: livekit-server binary not found! Please reinstall the server or check the installation script."
    exit 1
fi

if ! grep -q "^keys:" "${LIVEKIT_YAML_PATH}" 2>/dev/null; then
    echo "Generating LiveKit keys..."

    OUTPUT=$(./livekit-server generate-keys)

    API_KEY=$(echo "$OUTPUT" | awk '/API Key:/ {print $3}')
    API_SECRET=$(echo "$OUTPUT" | awk '/API Secret:/ {print $3}')

    if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
        echo "Key generation failed!"
        exit 1
    fi

    touch "${LIVEKIT_YAML_PATH}"

    /usr/local/bin/yq -i '
      .keys = {} |
      .keys["'"$API_KEY"'"] = "'"$API_SECRET"'"
    ' "${LIVEKIT_YAML_PATH}"

    echo "Keys written. Your API Key is: ${API_KEY}"
else
    echo "Keys already exist."
fi

# Replace any variables if we need to
if [ -n "$SERVER_PORT" ]; then
    /usr/local/bin/yq -i '.port = '"$SERVER_PORT" "${LIVEKIT_YAML_PATH}"
fi

if [ -n "$RTC_TCP_PORT" ]; then
    /usr/local/bin/yq -i '.rtc.tcp_port = '"$RTC_TCP_PORT" "${LIVEKIT_YAML_PATH}"
fi

if [ -n "$RTC_UDP_PORT" ]; then
    /usr/local/bin/yq -i '.rtc.udp_port = '"$RTC_UDP_PORT" "${LIVEKIT_YAML_PATH}"
fi

# Start livekit
exec ./livekit-server --config "${LIVEKIT_YAML_PATH}"