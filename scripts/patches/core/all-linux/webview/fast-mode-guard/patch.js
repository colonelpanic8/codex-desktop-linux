"use strict";

const {
  webviewAssetPatch,
} = require("../../../../descriptor.js");
const { applyLinuxFastModeModelGuardPatch } = require("../../../../impl/webview/index.js");

module.exports = [
  webviewAssetPatch({
    id: "linux-fast-mode-model-guard",
    phase: "webview-asset",
    order: 1040,
    ciPolicy: "required-upstream",
    // The current app keeps service-tier selection in the initial application
    // bundle. Its lookups are already optional-chain guarded, so this is
    // normally an idempotent no-op that still proves the protected surface is
    // present in the upstream build.
    pattern: /^app-initial-[A-Za-z0-9_-]+\.js$/,
    missingDescription: "fast-mode/service-tier availability bundle",
    skipDescription: "fast-mode model guard patch",
    apply: applyLinuxFastModeModelGuardPatch,
  }),
];
