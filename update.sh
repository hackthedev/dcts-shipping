#!/bin/bash

repo="hackthedev/dcts-shipping"
install_dir="$(cd "$(dirname "$0")" && pwd)"

echo "fetching latest release..."

api_response=$(curl -s "https://api.github.com/repos/$repo/releases/latest")

tag=$(echo "$api_response" | grep '"tag_name"' | head -1 | cut -d'"' -f4)
zip_url=$(echo "$api_response" | grep '"zipball_url"' | head -1 | cut -d'"' -f4)

if [ -z "$tag" ]; then
    echo "error: couldnt fetch release info"
    exit 1
fi

echo "latest release: $tag"
echo "downloading..."

tmp_zip="/tmp/dcts-update-$tag.zip"
tmp_dir="/tmp/dcts-update-$tag"

curl -sL "$zip_url" -o "$tmp_zip"

if [ ! -f "$tmp_zip" ]; then
    echo "error: download failed"
    exit 1
fi

echo "extracting..."

if [ -z "$tmp_dir" ] || [ "$tmp_dir" = "/" ]; then
    echo "error: tmp_dir is unsafe: $tmp_dir"
    exit 1
fi

rm -rf "$tmp_dir"
mkdir -p "$tmp_dir"
unzip -q "$tmp_zip" -d "$tmp_dir"

extracted_folder=$(ls "$tmp_dir" | head -1)

if [ -z "$extracted_folder" ]; then
    echo "error: extraction failed"
    exit 1
fi

echo "copying files to $install_dir..."

cp -r "$tmp_dir/$extracted_folder/." "$install_dir/"

if [ -z "$tmp_zip" ] || [ "$tmp_zip" = "/" ]; then
    echo "error: tmp_zip is unsafe: $tmp_zip"
    exit 1
fi

if [ -z "$tmp_dir" ] || [ "$tmp_dir" = "/" ]; then
    echo "error: tmp_dir is unsafe: $tmp_dir"
    exit 1
fi

rm -rf "$tmp_zip" "$tmp_dir"

echo ""
echo "done! updated to $tag"