#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  enabledLinuxFeatureIds,
  loadLinuxFeaturePatchDescriptors,
} = require("../../scripts/lib/linux-features.js");
const {
  applyMainProcessChunkPatchDescriptors,
  normalizePatchDescriptors,
} = require("../../scripts/patches/engine.js");
const { createPatchReport } = require("../../scripts/lib/patch-report.js");
const { PATCH_MARKER, applyExternalBrowserAccessPatch } = require("./patch.js");

// Shape of the cua_repl launcher builder in official Linux 26.1029.61003.
const LAUNCHER =
  'if(null==i||"win32"!==process.platform)try{return{...l,...null==i?{}:{command:"/bin/sh",args:["-c",' +
  `'export BROWSER_USE_ACCESS_EXECUTOR_ID="\${BROWSER_USE_ACCESS_EXECUTOR_ID-}"; exec "$@"'` +
  ',"cua-repl",n.command,...n.args]},env:o}}catch{}';

function quietly(fn) {
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    return { value: fn(), warnings };
  } finally {
    console.warn = originalWarn;
  }
}

function withTempFeatureRoot(enabled, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-external-browser-access-"));
  try {
    fs.writeFileSync(path.join(root, "features.example.json"), JSON.stringify({ enabled: [] }));
    fs.writeFileSync(path.join(root, "features.json"), JSON.stringify({ enabled }));
    fs.cpSync(__dirname, path.join(root, "external-browser-access"), { recursive: true });
    return fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("feature loads its descriptor only when enabled", () => {
  withTempFeatureRoot([], (root) => {
    assert.deepEqual(loadLinuxFeaturePatchDescriptors({ featuresRoot: root }), []);
  });
  withTempFeatureRoot(["external-browser-access"], (root) => {
    assert.deepEqual(enabledLinuxFeatureIds({ featuresRoot: root }), ["external-browser-access"]);
    assert.equal(loadLinuxFeaturePatchDescriptors({ featuresRoot: root }).length, 1);
  });
});

test("launcher no longer forces an empty executor ID and stays idempotent", () => {
  const patched = applyExternalBrowserAccessPatch(LAUNCHER);
  assert.doesNotMatch(patched, /BROWSER_USE_ACCESS_EXECUTOR_ID/);
  assert.ok(patched.includes(`"-c",${PATCH_MARKER}'exec "$@"',"cua-repl"`));
  assert.equal(applyExternalBrowserAccessPatch(patched), patched);
});

test("missing or ambiguous bootstrap scripts are left byte-identical with a warning", () => {
  for (const source of ["unrelated chunk", `${LAUNCHER}${LAUNCHER}`]) {
    const { value, warnings } = quietly(() => applyExternalBrowserAccessPatch(source));
    assert.equal(value, source);
    assert.equal(warnings.length, 1);
  }
});

test("a bundle without the bootstrap is reported as a miss, not as already applied", () => {
  withTempFeatureRoot(["external-browser-access"], (root) => {
    const descriptors = normalizePatchDescriptors(loadLinuxFeaturePatchDescriptors({ featuresRoot: root }));
    const run = (chunks) => {
      const report = createPatchReport();
      const patched = quietly(() => applyMainProcessChunkPatchDescriptors(chunks, descriptors, {}, report)).value;
      return { patched, status: report.patches[0].status };
    };

    const hit = run([
      { name: "early-bootstrap.js", source: "entry" },
      { name: "early-bootstrap-45-0123456789abcdef.js", source: LAUNCHER },
    ]);
    assert.equal(hit.status, "applied");
    assert.ok(hit.patched[1].source.includes(PATCH_MARKER));

    assert.equal(run([{ name: "early-bootstrap.js", source: "entry" }]).status, "skipped-optional");
  });
});
