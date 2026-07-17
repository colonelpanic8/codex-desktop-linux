"use strict";

const {
  webviewAssetPatch,
} = require("../../../../descriptor.js");
const {
  applyLinuxSidebarScrollFadePerformancePatch,
} = require("../../../../impl/webview/index.js");

module.exports = webviewAssetPatch({
  id: "linux-sidebar-scroll-fade-performance-mitigation",
  phase: "webview-asset",
  order: 1070,
  ciPolicy: "optional",
  pattern: /^app-(?!initial~)[^.]+\.css$/,
  missingDescription: "main webview stylesheet",
  skipDescription: "temporary Linux sidebar scroll performance mitigation",
  apply: applyLinuxSidebarScrollFadePerformancePatch,
});
