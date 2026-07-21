#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  loadLinuxFeaturePatchDescriptors,
} = require("../../scripts/lib/linux-features.js");
const {
  applyDisableSidebarThreadHoverCardsPatch,
  descriptors,
} = require("./patch.js");

const localThreadRowFixture = [
  "function hr(e){",
  "let t=(0,X.c)(5),{conversationId:i,disableHoverCard:_e,threadSummary:H}=e,",
  "Qe=_e===void 0?!1:_e,Kt=!1,",
  "rn=Qe?null:cr({conversationId:i,shouldFetchHoverBranch:Kt}),an=rn;",
  "let label=q.formatMessage({id:`codex.localTaskRow.archiveTask`});",
  "return hn({hoverCardContent:an,label})",
  "}",
].join("");

function withFeatureConfig(enabled, fn) {
  const originalConfig = process.env.CODEX_LINUX_FEATURES_CONFIG;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "disable-thread-hover-cards-"));
  process.env.CODEX_LINUX_FEATURES_CONFIG = path.join(tempDir, "features.json");
  try {
    fs.writeFileSync(process.env.CODEX_LINUX_FEATURES_CONFIG, JSON.stringify({ enabled }));
    return fn();
  } finally {
    if (originalConfig == null) {
      delete process.env.CODEX_LINUX_FEATURES_CONFIG;
    } else {
      process.env.CODEX_LINUX_FEATURES_CONFIG = originalConfig;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

test("feature is disabled until selected", () => {
  const featuresRoot = path.resolve(__dirname, "..");
  withFeatureConfig([], () => {
    assert.equal(
      loadLinuxFeaturePatchDescriptors({ featuresRoot })
        .some((descriptor) => descriptor.id === "feature:disable-sidebar-thread-hover-cards:local-thread-hover-card"),
      false,
    );
  });
  withFeatureConfig(["disable-sidebar-thread-hover-cards"], () => {
    assert.equal(
      loadLinuxFeaturePatchDescriptors({ featuresRoot })
        .some((descriptor) => descriptor.id === "feature:disable-sidebar-thread-hover-cards:local-thread-hover-card"),
      true,
    );
  });
});

test("disables watcher-backed local thread hover cards", () => {
  const patched = applyDisableSidebarThreadHoverCardsPatch(localThreadRowFixture);

  assert.match(patched, /Qe=!0/);
  assert.doesNotMatch(patched, /Qe=_e===void 0\?!1:_e/);
  assert.match(patched, /rn=Qe\?null:cr\(/);
});

test("patch is idempotent", () => {
  const patched = applyDisableSidebarThreadHoverCardsPatch(localThreadRowFixture);
  assert.equal(applyDisableSidebarThreadHoverCardsPatch(patched), patched);
});

test("leaves unrelated hover card components unchanged", () => {
  const unrelated =
    "function cloud(e){let {hoverCardContent:t}=e;return row({hoverCardContent:t})}";
  assert.equal(applyDisableSidebarThreadHoverCardsPatch(unrelated), unrelated);
});

test("descriptor follows the current sidebar local-thread chunk", () => {
  assert.equal(
    descriptors[0].pattern.test(
      "app-initial~app-main~onboarding-page~projects-index-page~hotkey-window-thread-page~chatgpt-~j34jmud9-BTI02UXW.js",
    ),
    true,
  );
  assert.equal(descriptors[0].pattern.test("chatgpt-conversation-page-BYOd5xtb.js"), false);
});
