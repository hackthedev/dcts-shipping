
#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-main}"
APP_DIR="/app"
REPO="hackthedev/dcts-shipping"

if [[ "$BRANCH" != "main" && "$BRANCH" != "dev" ]]; then
    echo "Usage: ./update.sh [main|dev]"
    exit 1
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

echo "Updating DCTS from $BRANCH..."

curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" -o "$TEMP_DIR/source.tar.gz"

mkdir -p "$TEMP_DIR/source"
tar -xzf "$TEMP_DIR/source.tar.gz" -C "$TEMP_DIR/source" --strip-components=1

for item in "$TEMP_DIR/source"/* "$TEMP_DIR/source"/.[!.]*; do
    [[ -e "$item" ]] || continue

    name=$(basename "$item")

    case "$name" in
        configs|uploads|emojis|plugins|themes|livekit|caddy|node_modules|.git|.env|update.sh)
            continue
            ;;
    esac

    cp -a "$item" "$APP_DIR/"
done

cd "$APP_DIR"

if command -v bun >/dev/null 2>&1; then
    if [[ -f bun.lock || -f bun.lockb ]]; then
        bun install
    fi
fi

echo "DCTS updated to $BRANCH."
echo "Restart the DCTS application process to load the changes."
