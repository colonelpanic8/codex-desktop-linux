"use strict";

const {
  webviewAssetPatch,
} = require("../../../../descriptor.js");
const {
  applySubagentNicknameMetadataPatch,
} = require("../../../../impl/webview/index.js");

module.exports = [
  webviewAssetPatch({
    id: "subagent-nickname-metadata-shape",
    phase: "webview-asset",
    order: 1050,
    ciPolicy: "required-upstream",
    // The current app keeps the thread_spawn metadata normalization helpers in
    // the initial application bundle.
    pattern: /^app-initial-[A-Za-z0-9_-]+\.js$/,
    missingDescription: "subagent metadata webview bundle",
    skipDescription: "subagent nickname metadata shape patch",
    apply: applySubagentNicknameMetadataPatch,
  }),
];
