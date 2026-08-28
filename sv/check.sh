#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# this starts the dcts server
if ! screen -list | grep -q "dcts_main"; then
    echo "dcts is not running"
    screen -dmSL "dcts_main" bun "$SCRIPT_DIR/../"
    echo "$SCRIPT_DIR"
fi

# this will start the livekit server
if ! screen -list | grep -q "dcts_livekit"; then
    echo "livekit is not running"
    screen -dmSL "dcts_livekit" livekit-server --config "$SCRIPT_DIR/../livekit/livekit.yaml"
fi