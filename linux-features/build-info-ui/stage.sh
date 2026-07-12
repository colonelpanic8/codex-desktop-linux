#!/bin/bash
set -Eeuo pipefail

feature_dir="$(cd "$(dirname "$0")" && pwd)"
target="$INSTALL_DIR/.codex-linux/features/build-info-ui/source-info.json"

mkdir -p "$(dirname "$target")"
node "$feature_dir/source-info.js" "$SCRIPT_DIR" "$target"
echo "Build information UI provenance staged" >&2
