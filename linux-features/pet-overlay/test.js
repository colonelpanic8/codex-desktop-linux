#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const {
  discoverLinuxFeatureManifests,
  enabledLinuxFeatureInstallPlan,
  loadLinuxFeaturePatchDescriptors,
} = require("../../scripts/lib/linux-features.js");
const {
  DESCRIPTOR_ID,
  applyPetOverlayPatch,
  mergedPetOverlaySettings,
} = require("./patch.js");

function copyFeatureTo(featuresRoot) {
  const featureDir = path.join(featuresRoot, "pet-overlay");
  fs.mkdirSync(featureDir, { recursive: true });
  for (const name of ["feature.json", "README.md", "patch.js", "gpu-compositing.env"]) {
    fs.copyFileSync(path.join(__dirname, name), path.join(featureDir, name));
  }
}

function applyPatchTwice(source, context = {}) {
  const patched = applyPetOverlayPatch(source, context);
  assert.equal(applyPetOverlayPatch(patched, context), patched);
  return patched;
}

function currentAvatarOverlayBundleFixture() {
  return [
    "let a=require(`electron`),f=require(`node:child_process`);",
    "var rV=`/avatar-overlay`,zB={width:356,height:320},oV={width:112,height:121},k2={width:0,height:0},O2={width:276,height:131};",
    "var h2=class{constructor(e,t,n,r){this.cursorSource=e;this.pointerAnchorX=t;this.pointerAnchorY=n;this.displayBounds=r}};",
    "var fV=class{window=null;rendererReady=!1;layout=null;mascotSize=oV;traySize=null;pointerInteractive=!1;mousePassthroughEnabled=!1;windowStagedForNativePresentation=!1;layoutMode=`native`;compositionHost={setOverlayWindow(){},isNativeMaterialAttached(){return!1},getCursorPosition(){return null},updateMascotRect(){}};nativePositionController={clear(){}};",
    "constructor(e,t){this.windowManager=e,this.globalState=t}",
    "isOpen(){let e=this.window;return e!=null&&!e.isDestroyed()&&e.isVisible()&&!this.windowStagedForNativePresentation}",
    "startDrag(e,t){let n=this.window;if(n==null||n.isDestroyed()||n.webContents.id!==e)return;this.cancelMomentum(),this.suppressNextRendererThrow=!1;let r=this.getLayout(n);this.nativePositionController.clear();let i=null,o=t.pointerScreenX!=null&&t.pointerScreenY!=null?{x:t.pointerScreenX,y:t.pointerScreenY}:a.screen.getCursorScreenPoint(),s=i??o,c=t.pointerWindowX-r.mascot.left,l=t.pointerWindowY-r.mascot.top;this.dragState=new h2(i==null?`renderer`:`native`,c,l,a.screen.getDisplayNearestPoint(s).bounds)}",
    "setElementSize(e,{elementSizeRevision:t,isTrayVisible:n,mascot:r,nativeCompositionEnabled:a,tray:o}){let i=this.window;i==null||i.isDestroyed()||i.webContents.id!==e||(this.cancelMomentum(),this.layoutMode=n==null?`native`:`legacy`,this.mascotSize=r,this.traySize=o,this.applyLatestElementSizes(i),this.stageWindowForNativePresentation(i),this.showWindowIfReady(i))}",
    "applyLatestElementSizes(e){this.anchor={...this.anchor,width:this.mascotSize.width,height:this.mascotSize.height},this.applyLayout(e)}",
    "async createWindow(e){let t=await this.windowManager.createWindow({title:a.app.getName(),width:zB.width,height:zB.height,appearance:`avatarOverlay`,alwaysOnTop:process.platform===`linux`,skipTaskbar:process.platform===`linux`,focusable:process.platform===`linux`?!0:!1,show:!1,initialRoute:rV});return this.window=t,this.compositionHost.setOverlayWindow(t),this.rendererReady=this.windowManager.isWebContentsReady(t.webContents.id),this.displayBounds=null,this.displayId=null,this.dragState=null,this.layout=null,this.mascotSize=oV,this.mousePassthroughEnabled=!1,this.traySize=null,t.on(`closed`,()=>{this.window===t&&(this.cancelMomentum(),this.window=null,this.dragState=null,this.layout=null,this.rendererReady=!1,this.pointerInteractive=!1,this.mousePassthroughEnabled=!1,this.compositionHost.setOverlayWindow(null),this.broadcastOpenState())}),t}",
    "applyLayout(e,t=this.getCurrentDisplay(),n=!1,r=!0,i=null){if(e.isDestroyed())return;let o=this.getLayoutForDisplay(t);this.displayId=t.id,this.layout=o,this.setWindowBounds(e,o.windowBounds,n,r),this.compositionHost.updateMascotRect(o.mascot),this.sendLayoutToRenderer(e,i)}getLayoutForDisplay(e){return UB({anchor:this.anchor,displayBounds:this.layoutMode===`native`?e.workArea:e.bounds,mode:this.layoutMode,mascotSize:this.mascotSize,nativeMaterialAttached:this.compositionHost.isNativeMaterialAttached(),previousPlacement:this.placement,traySize:this.traySize??(this.layoutMode===`native`?k2:O2)})}getLayout(e){if(this.layout??this.applyLayout(e),this.layout==null)throw Error(`Expected avatar overlay layout`);return this.layout}",
    "showWindow(e){if(e.isDestroyed())return;let t=this.isOpen();this.windowStagedForNativePresentation&&=(e.setOpacity(1),!1),e.moveTop(),e.showInactive(),!t&&this.isOpen()&&(this.finishPendingPresentation(),this.broadcastOpenState())}showWindowIfReady(e){!this.rendererReady||this.initialPresentationState!==`ready`||(this.showWindow(e),this.applyPointerInteractivityPolicy())}stageWindowForNativePresentation(e){e.isDestroyed()||this.applyPointerInteractivityPolicy()}broadcastOpenState(){this.windowManager.sendMessageToAllRegisteredWindows({type:`avatar-overlay-open-state-changed`,isOpen:this.isOpen()})}",
    "applyPointerInteractivityPolicy(){return null}cancelMomentum(){}finishPendingPresentation(){}sendLayoutToRenderer(){}setWindowBounds(){}getCurrentDisplay(){return{id:1,bounds:{x:0,y:0,width:1920,height:1080},workArea:{x:0,y:0,width:1920,height:1080}}}};",
    "function L9({platform:e,appearance:t,opaqueWindowSurfaceEnabled:n,prefersDarkColors:r}){return n?{backgroundColor:r?_ne:vne,backgroundMaterial:e===`win32`?`none`:null}:e===`win32`?{backgroundColor:k9,backgroundMaterial:`mica`}:{backgroundColor:k9,backgroundMaterial:null}}",
  ].join("");
}

function legacyAvatarOverlayBundleFixture() {
  return [
    "let n=require(`electron`);",
    "var rV=`/avatar-overlay`,zB={width:356,height:320},oV={width:112,height:121},sV={width:276,height:131};",
    "var fV=class{window=null;anchor={x:0,y:0,width:112,height:121};dragState=null;layout=null;mascotSize=oV;placement=`top-end`;traySize=null;",
    "constructor(e,t){this.windowManager=e,this.globalState=t}",
    "async createWindow(e){let t=await this.windowManager.createWindow({appearance:`avatarOverlay`,focusable:process.platform===`linux`?!0:!1,show:!1,initialRoute:rV});return this.window=t,t}",
    "applyLayout(e,t=n.screen.getDisplayNearestPoint(this.anchor).bounds){if(e.isDestroyed())return;let r=UB({anchor:this.anchor,displayBounds:t,mascotSize:this.mascotSize,previousPlacement:this.placement,traySize:this.traySize??sV});this.anchor=r.anchor,this.layout=r,this.placement=r.placement,this.setWindowBounds(e,r.windowBounds),this.sendLayoutToRenderer(e)}getLayout(e){return this.layout}",
    "showWindow(e){if(e.isDestroyed())return;e.moveTop(),e.showInactive(),this.broadcastOpenState()}startDrag(e,t){this.dragState={}}broadcastOpenState(){}sendLayoutToRenderer(){}setWindowBounds(){}};",
  ].join("");
}

function controllerFromPatchedSource(patched, overrides = {}) {
  const context = {
    globalThis: {},
    process: {
      env: {},
      pid: 4242,
      platform: "linux",
      ...overrides.process,
    },
    require(moduleName) {
      if (moduleName === "node:child_process") {
        return overrides.childProcess ?? { execFile() {} };
      }
      if (moduleName === "electron") {
        return {
          app: { getName: () => "Codex" },
          screen: {
            getCursorScreenPoint: () => ({ x: 0, y: 0 }),
            getDisplayNearestPoint: () => ({ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }),
          },
        };
      }
      throw new Error(`Unexpected module: ${moduleName}`);
    },
    UB: overrides.UB ?? (() => ({
      anchor: { x: 10, y: 10, width: 40, height: 40 },
      mascot: { left: 10, top: 10, width: 40, height: 40 },
      placement: "top-end",
      tray: { left: 10, top: 54, width: 276, height: 131 },
      windowBounds: { x: 0, y: 0, width: 356, height: 320 },
    })),
  };
  vm.runInNewContext(`${patched};globalThis.Controller=fV;`, context);
  const controller = new context.globalThis.Controller(
    { isWebContentsReady: () => true, sendMessageToAllRegisteredWindows() {} },
    { set() {} },
  );
  return { context, controller };
}

function runLayout(patched, featureContext) {
  const { context, controller } = controllerFromPatchedSource(patched);
  controller.setWindowBounds = (_window, bounds) => {
    context.bounds = bounds;
  };
  controller.sendLayoutToRenderer = () => {};
  controller.applyLayout(
    { isDestroyed: () => false },
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
  );
  assert.ok(featureContext);
  return { context, controller };
}

test("pet-overlay is discoverable and disabled until listed in features.json", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pet-overlay-feature-"));
  try {
    const featuresRoot = path.join(tempDir, "linux-features");
    fs.mkdirSync(featuresRoot, { recursive: true });
    copyFeatureTo(featuresRoot);
    fs.writeFileSync(path.join(featuresRoot, "features.example.json"), '{"enabled":[]}\n');

    const manifests = discoverLinuxFeatureManifests({ featuresRoot });
    assert.equal(manifests.length, 1);
    assert.equal(manifests[0].id, "pet-overlay");
    assert.equal(manifests[0].manifest.defaultEnabled, false);
    assert.deepEqual(loadLinuxFeaturePatchDescriptors({ featuresRoot }), []);

    fs.writeFileSync(path.join(featuresRoot, "features.json"), '{"enabled":["pet-overlay"]}\n');
    const descriptors = loadLinuxFeaturePatchDescriptors({ featuresRoot });
    assert.deepEqual(
      descriptors.map((descriptor) => [descriptor.id, descriptor.phase, descriptor.ciPolicy]),
      [[`feature:pet-overlay:${DESCRIPTOR_ID}`, "main-bundle", "optional"]],
    );
    const plan = enabledLinuxFeatureInstallPlan({ featuresRoot });
    assert.deepEqual(
      plan.runtimeHooks.map((hook) => [hook.key, hook.target, hook.mode.toString(8)]),
      [["env", ".codex-linux/env.d/pet-overlay-gpu-compositing.env", "644"]],
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("ships only overlay behavior, not selector/default/custom pet changes", () => {
  const patchSource = fs.readFileSync(path.join(__dirname, "patch.js"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "feature.json"), "utf8"));

  assert.equal(manifest.defaultEnabled, false);
  assert.equal(manifest.entrypoints.patchDescriptors, "./patch.js");
  assert.deepEqual(manifest.runtimeHooks.env, {
    source: "gpu-compositing.env",
    name: "gpu-compositing.env",
    mode: "0644",
  });
  assert.match(
    fs.readFileSync(path.join(__dirname, "gpu-compositing.env"), "utf8"),
    /^CODEX_ELECTRON_DISABLE_GPU_COMPOSITING=0$/m,
  );
  assert.doesNotMatch(patchSource, /custom:los|DEFAULT_PET|selected-avatar-id|avatarMenuItems|pets\/los/);
});

test("patches current avatar overlay layout, transparency, and window sync", () => {
  const patched = applyPatchTwice(currentAvatarOverlayBundleFixture());

  assert.match(patched, /codexPetOverlayLayoutForDisplay\(t,this\.getLayoutForDisplay\(t\),e\)/);
  assert.match(patched, /codexPetOverlaySyncWindow\(e\)/);
  assert.match(patched, /setVisibleOnAllWorkspaces/);
  assert.match(patched, /setAlwaysOnTop/);
  assert.match(patched, /setSkipTaskbar/);
  assert.match(patched, /t===`avatarOverlay`\?\{backgroundColor:`#00000000`,backgroundMaterial:null\}/);
  assert.equal((patched.match(/codexPetOverlayLayoutForDisplay/g) ?? []).length, 2);
});

test("patches legacy avatar overlay layout shape", () => {
  const patched = applyPatchTwice(legacyAvatarOverlayBundleFixture());

  assert.match(
    patched,
    /r=this\.codexPetOverlayLayoutForDisplay\(t,r,e\),this\.anchor=r\.anchor,this\.layout=r/,
  );
});

test("lockPosition true pins the mascot to the configured display gravity", () => {
  const context = {
    feature: {
      manifest: { petOverlay: { lockPosition: true, gravity: "bottom-right", margin: 24 } },
      settings: {},
    },
  };
  const patched = applyPetOverlayPatch(currentAvatarOverlayBundleFixture(), context);
  const { context: runtimeContext, controller } = runLayout(patched, context);

  assert.deepEqual(JSON.parse(JSON.stringify(runtimeContext.bounds)), {
    x: 1540,
    y: 736,
    width: 356,
    height: 320,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(controller.layout.mascot)), {
    left: 316,
    top: 280,
    width: 40,
    height: 40,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(controller.layout.tray)), {
    left: 80,
    top: 145,
    width: 276,
    height: 131,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(controller.layout.anchor)), {
    x: 1856,
    y: 1016,
    width: 40,
    height: 40,
  });
});

test("unlocked mode preserves a visible manual window position when no tray needs re-anchoring", () => {
  const patched = applyPetOverlayPatch(currentAvatarOverlayBundleFixture(), {
    feature: { manifest: { petOverlay: { lockPosition: false } }, settings: {} },
  });
  const { context, controller } = controllerFromPatchedSource(patched, {
    UB: () => ({
      anchor: { x: 10, y: 10, width: 40, height: 40 },
      mascot: { left: 10, top: 10, width: 40, height: 40 },
      placement: "top-end",
      tray: null,
      windowBounds: { x: 0, y: 0, width: 356, height: 320 },
    }),
  });
  controller.codexPetOverlayInitialPositionDone = true;
  controller.setWindowBounds = (_window, bounds) => {
    context.bounds = bounds;
  };
  controller.sendLayoutToRenderer = () => {};
  controller.applyLayout(
    {
      getBounds: () => ({ x: 930, y: 410, width: 356, height: 320 }),
      isDestroyed: () => false,
      isVisible: () => true,
    },
    { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 }, workArea: { x: 0, y: 0, width: 1920, height: 1080 } },
  );

  assert.deepEqual(JSON.parse(JSON.stringify(context.bounds)), { x: 930, y: 410, width: 356, height: 320 });
  assert.equal(controller.codexPetOverlayManualPosition, true);
});

test("syncs overlay window hints without requiring Hyprland", () => {
  const patched = applyPetOverlayPatch(currentAvatarOverlayBundleFixture());
  const calls = [];
  const { controller } = controllerFromPatchedSource(patched);
  controller.window = { isDestroyed: () => false, isVisible: () => false };
  controller.showWindow({
    isDestroyed: () => false,
    moveTop: () => calls.push("moveTop"),
    setAlwaysOnTop: (value) => calls.push(["always", value]),
    setBackgroundColor: (value) => calls.push(["background", value]),
    setFocusable: (value) => calls.push(["focusable", value]),
    setOpacity: (value) => calls.push(["opacity", value]),
    setSkipTaskbar: (value) => calls.push(["skip", value]),
    setVisibleOnAllWorkspaces: (value, options) => calls.push(["workspaces", value, options.visibleOnFullScreen]),
    showInactive: () => calls.push("showInactive"),
    webContents: {
      executeJavaScript: (script) => calls.push(["js", script]),
      insertCSS: (css, options) => calls.push(["css", css, options]),
    },
  });

  assert.equal(calls[0], "moveTop");
  assert.equal(calls[1], "showInactive");
  assert.deepEqual(calls.slice(2, 6), [
    ["focusable", true],
    ["skip", true],
    ["always", true],
    ["background", "#00000000"],
  ]);
  assert.equal(calls[6][0], "css");
  assert.equal(calls[6][2].cssOrigin, "author");
  assert.equal(calls[7][0], "js");
  assert.match(calls[6][1], /background:transparent!important/);
  assert.match(calls[7][1], /document\.documentElement\.style\.background/);
  assert.deepEqual(calls.slice(8), [["opacity", 1], ["workspaces", true, true], "moveTop"]);
});

test("passive mode makes the overlay non-focusable", () => {
  const patched = applyPetOverlayPatch(currentAvatarOverlayBundleFixture(), {
    feature: { manifest: { petOverlay: { mode: "passive" } }, settings: {} },
  });

  assert.match(
    patched,
    /appearance:`avatarOverlay`,alwaysOnTop:process\.platform===`linux`,skipTaskbar:process\.platform===`linux`,focusable:!1/,
  );
});

function runHyprlandHintScenario({ clientsJson, execError = null, settings = {}, env = { XDG_CURRENT_DESKTOP: "Hyprland" } }) {
  const calls = [];
  const patched = applyPetOverlayPatch(currentAvatarOverlayBundleFixture(), {
    feature: { manifest: { petOverlay: { hyprland: true } }, settings },
  });
  const { controller } = controllerFromPatchedSource(patched, {
    process: { env },
    childProcess: {
      execFile(command, args, _options, callback) {
        assert.equal(command, "hyprctl");
        calls.push(args);
        if (args[0] === "clients") {
          callback(execError, clientsJson);
          return;
        }
        callback?.(null, "ok");
      },
    },
  });

  controller.codexPetOverlayApplyHyprlandHints({
    getBounds: () => ({ x: 1540, y: 736, width: 356, height: 320 }),
    isDestroyed: () => false,
  });

  return calls;
}

test("targets only the unambiguous Hyprland pet window address", () => {
  const calls = runHyprlandHintScenario({
    clientsJson: JSON.stringify([
      {
        address: "0x100",
        at: [0, 0],
        class: "Codex",
        floating: false,
        fullscreen: 0,
        pid: 4242,
        pinned: false,
        size: [1920, 1080],
        title: "Codex",
      },
      {
        address: "0x200",
        at: [1540, 736],
        class: "Codex",
        floating: true,
        fullscreen: 0,
        pid: 4242,
        pinned: false,
        size: [356, 320],
        title: "Codex Pet",
      },
    ]),
  });

  assert.equal(JSON.stringify(calls[0]), JSON.stringify(["clients", "-j"]));
  assert.ok(calls.some((args) => args.join(" ").includes('hl.dsp.window.pin({ action = "on", window = "address:0x200" })')));
  assert.ok(calls.some((args) => args.join(" ").includes('prop = "decorate", value = "0", window = "address:0x200"')));
  assert.ok(calls.some((args) => args.join(" ").includes('prop = "no_shadow", value = "1", window = "address:0x200"')));
  assert.ok(calls.some((args) => args.join(" ").includes('hl.dsp.window.alter_zorder({ mode = "top", window = "address:0x200" })')));
  assert.ok(calls.every((args) => !args.join(" ").includes("0x100")));
});

test("missing hyprctl does not dispatch compositor mutations", () => {
  const calls = runHyprlandHintScenario({
    execError: new Error("ENOENT"),
    clientsJson: "",
  });

  assert.equal(JSON.stringify(calls), JSON.stringify([["clients", "-j"]]));
});

test("invalid Hyprland client JSON does not dispatch compositor mutations", () => {
  const calls = runHyprlandHintScenario({
    clientsJson: "not-json",
  });

  assert.equal(JSON.stringify(calls), JSON.stringify([["clients", "-j"]]));
});

test("multiple matching Hyprland clients are treated as ambiguous", () => {
  const calls = runHyprlandHintScenario({
    clientsJson: JSON.stringify([
      {
        address: "0x201",
        at: [1540, 736],
        class: "Codex",
        floating: true,
        fullscreen: 0,
        pid: 4242,
        size: [356, 320],
        title: "Codex Pet",
      },
      {
        address: "0x202",
        at: [1541, 736],
        class: "Codex",
        floating: true,
        fullscreen: 0,
        pid: 4242,
        size: [356, 320],
        title: "Codex",
      },
    ]),
  });

  assert.equal(JSON.stringify(calls), JSON.stringify([["clients", "-j"]]));
});

test("Hyprland no-match result is ignored", () => {
  const calls = runHyprlandHintScenario({
    clientsJson: JSON.stringify([
      {
        address: "0x300",
        at: [10, 10],
        class: "Terminal",
        floating: true,
        fullscreen: 0,
        pid: 9999,
        size: [800, 600],
        title: "Terminal",
      },
    ]),
  });

  assert.equal(JSON.stringify(calls), JSON.stringify([["clients", "-j"]]));
});

test("settings can turn Hyprland handling off", () => {
  const calls = runHyprlandHintScenario({
    clientsJson: JSON.stringify([
      {
        address: "0x200",
        at: [1540, 736],
        class: "Codex",
        floating: true,
        fullscreen: 0,
        pid: 4242,
        size: [356, 320],
        title: "Codex Pet",
      },
    ]),
    settings: { petOverlay: { hyprland: false } },
  });

  assert.deepEqual(calls, []);
});

test("environment overrides can turn Hyprland handling off", () => {
  const calls = runHyprlandHintScenario({
    clientsJson: JSON.stringify([
      {
        address: "0x200",
        at: [1540, 736],
        class: "Codex",
        floating: true,
        fullscreen: 0,
        pid: 4242,
        size: [356, 320],
        title: "Codex Pet",
      },
    ]),
    env: { XDG_CURRENT_DESKTOP: "Hyprland", CODEX_PET_OVERLAY_HYPRLAND: "0" },
  });

  assert.deepEqual(calls, []);
});

test("settings validation falls back to safe defaults", () => {
  assert.deepEqual(
    mergedPetOverlaySettings({
      feature: {
        manifest: { petOverlay: { gravity: "bottom-right", margin: 24, mode: "interactive" } },
        settings: { petOverlay: { gravity: "middle", margin: 9999, mode: "unknown", lockPosition: true } },
      },
    }),
    {
      allWorkspaces: true,
      alwaysOnTop: true,
      gravity: "bottom-right",
      hyprland: true,
      lockPosition: true,
      margin: 512,
      mode: "interactive",
      skipTaskbar: true,
    },
  );
});
