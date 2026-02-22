#!/bin/sh

#get api keys and secrets


#add api keys and secrets
ENV_FILE="config.env"

if ! grep -q "^API_KEY=" "$ENV_FILE"; then
    if ! grep -q "^keys:" "${LIVEKIT_YAML_PATH}" 2>/dev/null; then
        echo "Generating LiveKit keys..."

        OUTPUT=$(/livekit-server generate-keys)

        API_KEY=$(echo "$OUTPUT" | awk '/API Key:/ {print $3}')
        API_SECRET=$(echo "$OUTPUT" | awk '/API Secret:/ {print $3}')

        if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
            echo "Key generation failed!"
            exit 1
        fi

        echo "Keys written."
    else
        LINE=$(grep -v "^keys:" "$LIVEKIT_YAML_PATH" | head -n1 | tr -d ' ')
        API_KEY=${LINE%%:*}
        API_SECRET=${LINE#*:}

        if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
            echo "Failed to read existing keys!"
            exit 1

        echo "Loaded existing keys from ${LIVEKIT_YAML_PATH}"
        fi
    fi

    API_KEY_CLEAN=$(echo "$API_KEY" | tr -d '\r\n')
    API_SECRET_CLEAN=$(echo "$API_SECRET" | tr -d '\r\n')


    echo "" >> "$ENV_FILE"
    echo "" >> "$ENV_FILE"
    echo "# SECRET KEYS DO NOT EDIT" >> "$ENV_FILE"
    
    echo "API_KEY=$API_KEY_CLEAN" >> "$ENV_FILE"
    echo "API_SECRET=$API_SECRET_CLEAN" >> "$ENV_FILE"

    echo "API keys added to $ENV_FILE"
else
    if grep -q "^API_KEY=" "$ENV_FILE"; then
        API_KEY=$(grep "^API_KEY=" "$ENV_FILE" | cut -d '=' -f2-)
    fi

    if grep -q "^API_SECRET=" "$ENV_FILE"; then
        API_SECRET=$(grep "^API_SECRET=" "$ENV_FILE" | cut -d '=' -f2-)
    fi

    API_KEY_CLEAN=$(echo "$API_KEY" | tr -d '\r\n')
    API_SECRET_CLEAN=$(echo "$API_SECRET" | tr -d '\r\n')

    echo "Loaded API keys from $ENV_FILE"
fi

#livekit.yaml creation
echo "Creating base LiveKit config..."

cat <<EOF > "${LIVEKIT_YAML_PATH}"
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 7882
  port_range_end: 7882
  enable_loopback_candidate: false
redis:
  address: dcts-redis:6379
  username: ""
  password: ""
  db: 0
  use_tls: false
turn:
  enabled: true
  domain: ${LIVEKIT_URL}
  tls_port: 5349
  udp_port: 3478
  external_tls: true
keys:
  '$API_KEY_CLEAN': '$API_SECRET_CLEAN'
EOF


exec /livekit-server --config "${LIVEKIT_YAML_PATH}"
