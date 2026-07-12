#!/bin/bash
set -Eeuo pipefail

source_info="$PACKAGE_APP_DIR/.codex-linux/features/build-info-ui/source-info.json"
update_builder_info="$PACKAGE_APP_DIR/update-builder/.codex-linux/features/build-info-ui/source-info.json"
update_builder_manifest="$PACKAGE_APP_DIR/update-builder/.codex-linux/update-builder-manifest.txt"
manifest_entry=".codex-linux/features/build-info-ui/source-info.json"

[ -f "$source_info" ] || exit 0
[ -d "$PACKAGE_APP_DIR/update-builder" ] || exit 0
mkdir -p "$(dirname "$update_builder_info")"
install -m 0644 "$source_info" "$update_builder_info"

if [ -f "$update_builder_manifest" ]; then
    manifest_tmp="${update_builder_manifest}.tmp.$$"
    {
        cat "$update_builder_manifest"
        printf '%s\n' "$manifest_entry"
    } | LC_ALL=C sort -u > "$manifest_tmp"
    mv -f "$manifest_tmp" "$update_builder_manifest"
fi
