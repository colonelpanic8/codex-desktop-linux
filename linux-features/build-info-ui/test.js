#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  disabledLinuxFeatureCleanupHooks,
  enabledLinuxFeatureIds,
  enabledLinuxFeaturePackageHooks,
  enabledLinuxFeatureStageHooks,
  loadLinuxFeaturePatchDescriptors,
} = require("../../scripts/lib/linux-features.js");
const {
  applyBuildInfoMainPatch,
  applyBuildInfoSettingsSource,
  descriptors,
  patchBuildInfoSettingsAssets,
} = require("./patch.js");
const {
  captureSourceInfo,
  githubCommitUrl,
  writeSourceInfo,
} = require("./source-info.js");

function withFeatureConfig(enabled, fn) {
  const original = process.env.CODEX_LINUX_FEATURES_CONFIG;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-ui-config-"));
  process.env.CODEX_LINUX_FEATURES_CONFIG = path.join(tempDir, "features.json");
  fs.writeFileSync(process.env.CODEX_LINUX_FEATURES_CONFIG, JSON.stringify({ enabled }));
  try {
    return fn(path.resolve(__dirname, ".."));
  } finally {
    if (original == null) delete process.env.CODEX_LINUX_FEATURES_CONFIG;
    else process.env.CODEX_LINUX_FEATURES_CONFIG = original;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function applyTwice(patch, source) {
  const once = patch(source);
  const twice = patch(once);
  assert.equal(twice, once);
  return once;
}

function captureWarns(fn) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(" "));
  try {
    return { value: fn(), warnings };
  } finally {
    console.warn = original;
  }
}

test("build info UI stays disabled until explicitly enabled", () => {
  withFeatureConfig([], (featuresRoot) => {
    assert.deepEqual(enabledLinuxFeatureIds({ featuresRoot }), []);
    assert.deepEqual(loadLinuxFeaturePatchDescriptors({ featuresRoot }), []);
  });
});

test("build info UI exposes only opt-in feature descriptors", () => {
  withFeatureConfig(["build-info-ui"], (featuresRoot) => {
    const descriptors = loadLinuxFeaturePatchDescriptors({ featuresRoot });
    assert.deepEqual(
      descriptors.map(({ name, phase, ciPolicy }) => [name, phase, ciPolicy]),
      [
        ["feature:build-info-ui:main-process", "main-bundle", "optional"],
        ["feature:build-info-ui:settings", "extracted-app:post-webview", "optional"],
      ],
    );
    assert.equal(path.basename(enabledLinuxFeatureStageHooks({ featuresRoot })[0].path), "stage.sh");
    assert.equal(
      path.basename(enabledLinuxFeaturePackageHooks({ featuresRoot, packageFormat: "deb" })[0].path),
      "package.sh",
    );
    assert.equal(
      disabledLinuxFeatureCleanupHooks({ featuresRoot }).some(({ id }) => id === "build-info-ui"),
      false,
    );
  });
});

test("disabling build info UI exposes its cleanup hook", () => {
  withFeatureConfig([], (featuresRoot) => {
    const hooks = disabledLinuxFeatureCleanupHooks({ featuresRoot });
    const hook = hooks.find(({ id }) => id === "build-info-ui");
    assert.equal(path.basename(hook.path), "cleanup.sh");
  });
});

test("main-process feature adds the secure dialog, handlers, Help item, and tray item", () => {
  const source = [
    "let a=require(`electron`),l=require(`node:fs`),s=require(`node:path`),e={bn:{help:`help`}};",
    "const h={\"get-global-state\":async({key:a})=>({value:a}),\"set-global-state\":async()=>({success:!0})};",
    "var T=class{getNativeTrayMenuItems(){return[{label:`Open`}]} };",
    "let m=[{role:`help`,id:e.bn.help,submenu:[{label:`Docs`,click:()=>{}}]}];",
  ].join("");
  const patched = applyTwice(applyBuildInfoMainPatch, source);

  assert.match(patched, /function codexLinuxBuildInfoFeatureShow\(\)/);
  assert.match(patched, /\.codex-linux`,\`features`,\`build-info-ui`/);
  assert.match(patched, /Commit subject/);
  assert.match(patched, /new a\.BrowserWindow/);
  assert.match(patched, /contextIsolation:!0,nodeIntegration:!1,sandbox:!0/);
  assert.match(patched, /setWindowOpenHandler/);
  assert.match(patched, /__codexBuildInfoEvent\.preventDefault\(\),__codexBuildInfoOpenUrl/);
  assert.match(patched, /label:`Build Information`,click:\(\)=>\{codexLinuxBuildInfoFeatureShow\(\)\}/);
  assert.match(patched, /"codex-linux-get-build-info":async\(\)=>codexLinuxBuildInfoFeatureGet\(\)/);
  assert.doesNotThrow(() => new Function(patched));
});

test("main-process feature fails atomically when the IPC handler table drifts", () => {
  const source = [
    "let a=require(`electron`),l=require(`node:fs`),s=require(`node:path`),e={bn:{help:`help`}};",
    "var T=class{getNativeTrayMenuItems(){return[{label:`Open`}]} };",
    "let m=[{role:`help`,id:e.bn.help,submenu:[{label:`Docs`,click:()=>{}}]}];",
  ].join("");
  const { value, warnings } = captureWarns(() => applyBuildInfoMainPatch(source));
  assert.equal(value, source);
  assert.match(warnings.join("\n"), /IPC handler table/);
});

test("settings feature consumes the generic core extension point", () => {
  const source =
    "var React={Fragment:{}},$={jsx(){},jsxs(){}};var LinuxDesktopSettingsExtensions=[];" +
    "function LinuxDesktopSettingsExtensionSlot({mode}){return $.jsx(React.Fragment,{children:LinuxDesktopSettingsExtensions.map((Extension,index)=>$.jsx(Extension,{mode},index))})}";
  const patched = applyTwice(applyBuildInfoSettingsSource, source);

  assert.match(patched, /LinuxDesktopSettingsExtensions=\[LinuxBuildInfoSettingsExtension\]/);
  assert.match(patched, /class LinuxBuildInfoPanel extends React\.Component/);
  assert.match(patched, /Commit subject/);
  assert.match(patched, /Open on GitHub/);
  assert.match(patched, /mode==="group"/);
});

test("settings asset hook patches generated assets and reports drift", () => {
  const extractedDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-ui-settings-"));
  const assetsDir = path.join(extractedDir, "webview", "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(
    path.join(assetsDir, "linux-desktop-settings-linux.js"),
    "var LinuxDesktopSettingsExtensions=[];",
  );
  try {
    const first = patchBuildInfoSettingsAssets(extractedDir);
    const second = patchBuildInfoSettingsAssets(extractedDir);
    assert.deepEqual(first, { changed: true, matched: 1, reason: null });
    assert.deepEqual(second, { changed: false, matched: 1, reason: null });
    assert.match(
      fs.readFileSync(path.join(assetsDir, "linux-desktop-settings-linux.js"), "utf8"),
      /LinuxBuildInfoSettingsExtension/,
    );
  } finally {
    fs.rmSync(extractedDir, { recursive: true, force: true });
  }
});

test("settings descriptor reports a matched-but-unpatchable asset as feature drift", () => {
  const descriptor = descriptors.find(({ id }) => id === "settings");
  assert.deepEqual(
    descriptor.status({ changed: false, matched: 1, reason: null }, ["missing extension point"]),
    { status: "skipped-optional", reason: "missing extension point" },
  );
});

test("Nix-style no-git provenance produces a reproducible link and explicit missing subject", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-ui-nix-"));
  const outputA = path.join(repoDir, "a.json");
  const outputB = path.join(repoDir, "b.json");
  const env = {
    CODEX_LINUX_SOURCE_COMMIT: "0123456789abcdef0123456789abcdef01234567",
    CODEX_LINUX_SOURCE_REMOTE: "https://github.com/ilysenko/codex-desktop-linux.git",
    CODEX_LINUX_SOURCE_PROVENANCE: "nix-flake",
  };
  try {
    const info = captureSourceInfo(repoDir, env);
    assert.deepEqual(info, {
      commit: env.CODEX_LINUX_SOURCE_COMMIT,
      shortCommit: "0123456789ab",
      commitMessage: null,
      remote: "https://github.com/ilysenko/codex-desktop-linux.git",
      commitUrl: `https://github.com/ilysenko/codex-desktop-linux/commit/${env.CODEX_LINUX_SOURCE_COMMIT}`,
      provenance: "nix-flake",
    });
    writeSourceInfo(repoDir, outputA, env);
    writeSourceInfo(repoDir, outputB, env);
    assert.equal(fs.readFileSync(outputA, "utf8"), fs.readFileSync(outputB, "utf8"));
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test("Nix enables the feature with immutable source provenance inputs", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const flake = fs.readFileSync(path.join(repoRoot, "flake.nix"), "utf8");
  const nixFeatures = fs.readFileSync(path.join(repoRoot, "nix", "linux-features.nix"), "utf8");
  assert.match(nixFeatures, /"build-info-ui"/);
  assert.match(flake, /builtins\.elem "build-info-ui" linuxFeatureIds/);
  assert.match(flake, /export CODEX_LINUX_SOURCE_REMOTE="\$\{flakeSourceRemote\}"/);
  assert.match(flake, /export CODEX_LINUX_SOURCE_PROVENANCE="nix-flake"/);
  assert.doesNotMatch(flake, /CODEX_LINUX_SOURCE_COMMIT_MESSAGE=.*git/);
});

test("source capture sanitizes remotes and records an explicitly supplied subject", () => {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-ui-subject-"));
  try {
    const info = captureSourceInfo(repoDir, {
      CODEX_LINUX_SOURCE_COMMIT: "abcdef1234567890",
      CODEX_LINUX_SOURCE_COMMIT_MESSAGE: "Link tray build info to source commit",
      CODEX_LINUX_SOURCE_REMOTE: "https://token@github.com/example/repo.git",
    });
    assert.equal(info.commitMessage, "Link tray build info to source commit");
    assert.equal(info.remote, "https://github.com/example/repo.git");
    assert.equal(info.commitUrl, "https://github.com/example/repo/commit/abcdef1234567890");
    assert.equal(
      captureSourceInfo(repoDir, {
        CODEX_LINUX_SOURCE_COMMIT: "abcdef1234567890",
        CODEX_LINUX_SOURCE_REMOTE: "ssh://user:secret@github.com/example/repo.git",
      }).remote,
      "ssh://github.com/example/repo.git",
    );
    assert.equal(
      captureSourceInfo(repoDir, {
        CODEX_LINUX_SOURCE_COMMIT: "abcdef1234567890",
        CODEX_LINUX_SOURCE_REMOTE: "git@github.com:example/repo.git",
      }).remote,
      "ssh://github.com/example/repo.git",
    );
    assert.equal(githubCommitUrl("https://example.com/example/repo.git", info.commit), null);
  } finally {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }
});

test("native package hook preserves feature provenance in the update-builder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-ui-package-"));
  const appDir = path.join(root, "opt", "codex-desktop");
  const source = path.join(appDir, ".codex-linux", "features", "build-info-ui", "source-info.json");
  const target = path.join(appDir, "update-builder", ".codex-linux", "features", "build-info-ui", "source-info.json");
  const manifest = path.join(appDir, "update-builder", ".codex-linux", "update-builder-manifest.txt");
  fs.mkdirSync(path.dirname(source), { recursive: true });
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(source, '{"commit":"abcdef1234567890"}\n');
  fs.writeFileSync(manifest, "install.sh\n");
  try {
    execFileSync("bash", [path.join(__dirname, "package.sh")], {
      env: { ...process.env, PACKAGE_APP_DIR: appDir },
    });
    assert.equal(fs.readFileSync(target, "utf8"), fs.readFileSync(source, "utf8"));
    assert.equal(
      fs.readFileSync(manifest, "utf8"),
      ".codex-linux/features/build-info-ui/source-info.json\ninstall.sh\n",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("cleanup hook removes only feature-owned staged provenance", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-build-info-ui-cleanup-"));
  const featureDir = path.join(root, ".codex-linux", "features", "build-info-ui");
  const sibling = path.join(root, ".codex-linux", "features", "other-feature.json");
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, "source-info.json"), "{}\n");
  fs.writeFileSync(sibling, "{}\n");
  try {
    execFileSync("bash", [path.join(__dirname, "cleanup.sh")], {
      env: { ...process.env, INSTALL_DIR: root },
    });
    assert.equal(fs.existsSync(featureDir), false);
    assert.equal(fs.existsSync(sibling), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
