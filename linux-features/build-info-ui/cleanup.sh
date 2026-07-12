#!/bin/bash
set -Eeuo pipefail

feature_dir="$INSTALL_DIR/.codex-linux/features/build-info-ui"
rm -f "$feature_dir/source-info.json"
rmdir "$feature_dir" 2>/dev/null || true
