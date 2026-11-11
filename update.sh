
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

# delete this cauz im accidentally shipping these libs
# even tho they should be downloaded on first launch,
# but if dist.dcts.community goes down, its not missing (insert thinking emoji).
# tho if dist.dcts... goes down it means no backend libs! maybe i can do it there
# too somehow or someone mirrors it..
if [ -d "$APP_DIR/public/js/libs" ]; then
    rm -rf "$APP_DIR/public/js/libs"
fi

echo "DCTS updated to $BRANCH."
echo "Restart the DCTS application process to load the changes."
