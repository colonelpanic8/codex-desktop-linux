"use strict";

const {
  TRAY_GUARD_LOOKAHEAD,
  escapeRegExp,
  findMatchingBrace,
  requireName,
} = require("../../lib/minified-js.js");

function findNamedFunctionBody(source, functionName) {
  const functionMatch = source.match(
    new RegExp(`(?:async\\s+)?function\\s+${escapeRegExp(functionName)}\\([^)]*\\)\\{`),
  );
  if (functionMatch == null) {
    return null;
  }

  const openIndex = functionMatch.index + functionMatch[0].length - 1;
  const closeIndex = findMatchingBrace(source, openIndex);
  return closeIndex === -1 ? null : source.slice(openIndex, closeIndex + 1);
}

function isTrayFactoryFunction(source, functionName) {
  const body = findNamedFunctionBody(source, functionName);
  return body != null && /new [A-Za-z_$][\w$]*\.Tray\(/.test(body);
}

function findDynamicTraySetup(source) {
  const setupRegex =
    /let ([A-Za-z_$][\w$]*)=async\(\)=>\{[A-Za-z_$][\w$]*=!0;try\{await ([A-Za-z_$][\w$]*)\(\{appBrand:/g;
  let match;
  while ((match = setupRegex.exec(source)) != null) {
    const [, setupFn, factoryFn] = match;
    if (isTrayFactoryFunction(source, factoryFn)) {
      return { setupFn, factoryFn, index: match.index };
    }
  }
  return null;
}

function findDynamicTrayStartupCall(source, setupFn, startIndex) {
  const startupRegex = new RegExp(`([A-Za-z_$][\\w$]*)&&${escapeRegExp(setupFn)}\\(\\);`, "g");
  startupRegex.lastIndex = startIndex;
  return startupRegex.exec(source);
}

function addDynamicTraySetupFailureLogging(source, traySetup) {
  const logMessage = "[codex-linux] Failed to set up system tray";
  if (traySetup == null || source.includes(logMessage)) {
    return source;
  }

  const openIndex = source.indexOf("{", traySetup.index);
  if (openIndex === -1) {
    return source;
  }
  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex === -1) {
    return source;
  }

  const body = source.slice(openIndex, closeIndex + 1);
  if (!body.includes(`await ${traySetup.factoryFn}(`)) {
    return source;
  }

  const catchRegex = /catch\(([A-Za-z_$][\w$]*)\)\{/;
  const catchMatch = body.match(catchRegex);
  if (catchMatch == null) {
    return source;
  }

  const [, errorVar] = catchMatch;
  const catchOpenIndex = catchMatch.index + catchMatch[0].length - 1;
  const catchCloseIndex = findMatchingBrace(body, catchOpenIndex);
  if (catchCloseIndex === -1) {
    return source;
  }

  const catchBody = body.slice(catchOpenIndex + 1, catchCloseIndex);
  const separator = catchBody.trim().length === 0 || /[;,]$/.test(catchBody.trim()) ? "" : ";";
  const linuxWarning = `${separator}process.platform===\`linux\`&&console.warn(\`${logMessage}\`,${errorVar})`;
  const patchedBody =
    `${body.slice(0, catchCloseIndex)}${linuxWarning}${body.slice(catchCloseIndex)}`;
  return `${source.slice(0, openIndex)}${patchedBody}${source.slice(closeIndex + 1)}`;
}

function registerDynamicLinuxTrayInstance(source, traySetup) {
  if (source.includes("codexLinuxRegisterTray(")) {
    return source;
  }

  let factoryFn = traySetup?.factoryFn ?? null;
  if (factoryFn == null) {
    const factoryNames = [];
    const functionRegex = /(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\([^)]*\)\{/g;
    let match;
    while ((match = functionRegex.exec(source)) != null) {
      if (isTrayFactoryFunction(source, match[1])) {
        factoryNames.push(match[1]);
      }
    }
    if (factoryNames.length !== 1) {
      return source;
    }
    [factoryFn] = factoryNames;
  }

  const functionMatch = source.match(
    new RegExp(`(?:async\\s+)?function\\s+${escapeRegExp(factoryFn)}\\([^)]*\\)\\{`),
  );
  if (functionMatch == null) {
    return source;
  }

  const openIndex = functionMatch.index + functionMatch[0].length - 1;
  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex === -1) {
    return source;
  }

  const body = source.slice(openIndex, closeIndex + 1);
  const trayConstructorRegex =
    /([A-Za-z_$][\w$]*)=new ([A-Za-z_$][\w$]*)\.Tray\(([^;]*)\)/;
  const trayConstructorMatch = body.match(trayConstructorRegex);
  if (trayConstructorMatch == null) {
    return source;
  }

  const [, trayVar, electronVar, constructorArgs] = trayConstructorMatch;
  const patchedBody = body.replace(
    trayConstructorRegex,
    `${trayVar}=typeof codexLinuxRegisterTray===\`function\`?codexLinuxRegisterTray(new ${electronVar}.Tray(${constructorArgs})):new ${electronVar}.Tray(${constructorArgs})`,
  );
  return `${source.slice(0, openIndex)}${patchedBody}${source.slice(closeIndex + 1)}`;
}

function applyLinuxTrayPatch(currentSource, iconPathExpression) {
  let patchedSource = currentSource;
  const electronVar = requireName(currentSource, "electron");
  if (electronVar == null) {
    if (
      currentSource.includes("new ") && currentSource.includes(".Tray(") ||
      currentSource.includes("canHideLastWindowToTray") ||
      currentSource.includes("trayMenuThreads=")
    ) {
      console.warn(
        "WARN: Could not find tray Electron binding — skipping Linux tray patch",
      );
    }
    return currentSource;
  }
  const packagedTrayIconPathExpression = "process.resourcesPath+`/../.codex-linux/codex-desktop-tray.png`";
  const packagedAppIconPathExpression = "process.resourcesPath+`/../.codex-linux/codex-desktop.png`";

  const trayGuardNeedle =
    "process.platform!==`win32`&&process.platform!==`darwin`?null:";
  const trayGuardPatch =
    "process.platform!==`win32`&&process.platform!==`darwin`&&process.platform!==`linux`?null:";
  const trayGuardIndex = patchedSource.indexOf(trayGuardNeedle);
  if (patchedSource.includes(trayGuardPatch)) {
    // Already patched.
  } else if (
    trayGuardIndex !== -1 &&
    /new [A-Za-z_$][\w$]*\.Tray\(/.test(
      patchedSource.slice(trayGuardIndex, trayGuardIndex + TRAY_GUARD_LOOKAHEAD),
    )
  ) {
    patchedSource = patchedSource.replace(trayGuardNeedle, trayGuardPatch);
  } else {
    console.warn("WARN: Could not find tray platform guard — skipping Linux tray guard patch");
  }

  if (iconPathExpression != null) {
    const linuxIconFallback =
      `if(process.platform===\`linux\`){let __codexLinuxTrayIcon=${electronVar}.nativeImage.createFromPath(${packagedTrayIconPathExpression});if(!__codexLinuxTrayIcon.isEmpty())return{defaultIcon:__codexLinuxTrayIcon,chronicleRunningIcon:null};let __codexLinuxAppIcon=${electronVar}.nativeImage.createFromPath(${packagedAppIconPathExpression});if(!__codexLinuxAppIcon.isEmpty())return{defaultIcon:__codexLinuxAppIcon,chronicleRunningIcon:null};let __codexLinuxUpstreamTrayIcon=${electronVar}.nativeImage.createFromPath(${iconPathExpression});if(!__codexLinuxUpstreamTrayIcon.isEmpty())return{defaultIcon:__codexLinuxUpstreamTrayIcon,chronicleRunningIcon:null}}`;
    const trayIconFallbackRegex =
      /let ([A-Za-z_$][\w$]*)=([A-Za-z_$][\w$]*)\(([A-Za-z_$][\w$]*(?:,[A-Za-z_$][\w$]*)*)\);return \1==null\?\{defaultIcon:await ([A-Za-z_$][\w$]*)\.app\.getFileIcon\(process\.execPath,\{size:`small`\}\),chronicleRunningIcon:null\}:\{defaultIcon:\1,chronicleRunningIcon:null\}/;
    if (
      patchedSource.includes(`nativeImage.createFromPath(${packagedTrayIconPathExpression})`) ||
      patchedSource.includes(`nativeImage.createFromPath(${packagedAppIconPathExpression})`)
    ) {
      // Already patched.
    } else if (trayIconFallbackRegex.test(patchedSource)) {
      patchedSource = patchedSource.replace(
        trayIconFallbackRegex,
        (_match, resultAlias, resolverAlias, resolverArgs, electronAlias) =>
          `let ${resultAlias}=${resolverAlias}(${resolverArgs});if(${resultAlias}!=null)return{defaultIcon:${resultAlias},chronicleRunningIcon:null};${linuxIconFallback}return{defaultIcon:await ${electronAlias}.app.getFileIcon(process.execPath,{size:\`small\`}),chronicleRunningIcon:null}`,
      );
    } else {
      console.warn("WARN: Could not find tray icon fallback — skipping Linux tray icon patch");
    }
  }

  const patchedCloseToTrayRegex =
    /if\(\(process\.platform===`win32`\|\|process\.platform===`linux`\)&&!this\.isAppQuitting&&!\(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress\(\)\)&&this\.options\.canHideLastWindowToTray\?\.\(\)===!0&&![A-Za-z_$][\w$]*\)\{[A-Za-z_$][\w$]*\.preventDefault\(\),[A-Za-z_$][\w$]*\.hide\(\);return\}/;
  if (patchedCloseToTrayRegex.test(patchedSource)) {
    // Already patched with a newer minifier's window variable.
  } else {
    const closeToTrayRegex =
      /if\(process\.platform===`win32`&&!this\.isAppQuitting&&this\.options\.(canHideLastWindowToTray)\?\.\(\)===!0&&!([A-Za-z_$][\w$]*)\)\{([A-Za-z_$][\w$]*)\.preventDefault\(\),([A-Za-z_$][\w$]*)\.hide\(\);return\}/;
    const closeToTrayMatch = patchedSource.match(closeToTrayRegex);
    if (closeToTrayMatch != null) {
      const [, gateMethodName, hasOtherWindowVar, eventVar, windowVar] = closeToTrayMatch;
      patchedSource = patchedSource.replace(
        closeToTrayRegex,
        `if((process.platform===\`win32\`||process.platform===\`linux\`)&&!this.isAppQuitting&&!(typeof codexLinuxIsQuitInProgress===\`function\`&&codexLinuxIsQuitInProgress())&&this.options.${gateMethodName}?.()===!0&&!${hasOtherWindowVar}){${eventVar}.preventDefault(),${windowVar}.hide();return}`,
      );
    } else {
      console.warn("WARN: Could not find close-to-tray condition — skipping Linux close-to-tray patch");
    }
  }

  const trayContextMethodNeedle =
    "trayMenuThreads={runningThreads:[],unreadThreads:[],pinnedThreads:[],recentThreads:[],usageLimits:[]};constructor(";
  const trayContextMethodPatch =
    `trayMenuThreads={runningThreads:[],unreadThreads:[],pinnedThreads:[],recentThreads:[],usageLimits:[]};setLinuxTrayContextMenu(){let e=${electronVar}.Menu.buildFromTemplate(this.getNativeTrayMenuItems());this.tray.setContextMenu?.(e);return e}constructor(`;
  const trayControllerClassPrefix =
    "nativeTrayClickSuppressionReason=null;clearNativeTrayClickSuppressionTimeout=null;chronicleTrayIconRefreshInterval=null;chronicleTrayIconState=`default`;isNativeTrayMenuOpen=!1;trayMenuThreads={runningThreads:[],unreadThreads:[],pinnedThreads:[],recentThreads:[],usageLimits:[]};";
  const trayRecoveryHelpers =
    `let codexLinuxTrayController=null,codexLinuxTrayRecoveryRegistered=!1,codexLinuxTrayRecoveryHandler=()=>{let e=codexLinuxTrayController;e?.setLinuxTrayContextMenu?.()},codexLinuxStopTrayRecovery=()=>{codexLinuxTrayRecoveryRegistered&&(${electronVar}.powerMonitor.removeListener?.(\`unlock-screen\`,codexLinuxTrayRecoveryHandler),${electronVar}.powerMonitor.removeListener?.(\`resume\`,codexLinuxTrayRecoveryHandler),${electronVar}.app.removeListener?.(\`will-quit\`,codexLinuxTrayQuitHandler),codexLinuxTrayRecoveryRegistered=!1),codexLinuxTrayController=null},codexLinuxTrayQuitHandler=()=>{codexLinuxStopTrayRecovery()},codexLinuxStartTrayRecovery=()=>{codexLinuxTrayRecoveryRegistered||(${electronVar}.powerMonitor.on(\`unlock-screen\`,codexLinuxTrayRecoveryHandler),${electronVar}.powerMonitor.on(\`resume\`,codexLinuxTrayRecoveryHandler),${electronVar}.app.once(\`will-quit\`,codexLinuxTrayQuitHandler),codexLinuxTrayRecoveryRegistered=!0)},codexLinuxSetTrayController=e=>(codexLinuxTrayController=e,codexLinuxStartTrayRecovery(),e);`;
  if (patchedSource.includes("setLinuxTrayContextMenu(){")) {
    patchedSource = patchedSource.replace(
      /setLinuxTrayContextMenu\(\)\{let e=[A-Za-z_$][\w$]*\.Menu\.buildFromTemplate\(this\.getNativeTrayMenuItems\(\)\);/,
      `setLinuxTrayContextMenu(){let e=${electronVar}.Menu.buildFromTemplate(this.getNativeTrayMenuItems());`,
    );
  } else if (patchedSource.includes(trayContextMethodNeedle)) {
    patchedSource = patchedSource.replace(trayContextMethodNeedle, trayContextMethodPatch);
  } else {
    console.warn("WARN: Could not find tray controller fields — skipping Linux tray context menu method patch");
  }

  const canSetLinuxTrayContextMenu = patchedSource.includes("setLinuxTrayContextMenu(){");
  if (!patchedSource.includes("codexLinuxTrayRecoveryHandler=")) {
    const trayControllerClassMatch = patchedSource.match(
      new RegExp(`var [A-Za-z_$][\\w$]*=class\\{${escapeRegExp(trayControllerClassPrefix)}`),
    );
    if (trayControllerClassMatch != null && trayControllerClassMatch.index != null) {
      patchedSource =
        `${patchedSource.slice(0, trayControllerClassMatch.index)}${trayRecoveryHelpers}${patchedSource.slice(trayControllerClassMatch.index)}`;
    } else if (canSetLinuxTrayContextMenu) {
      console.warn("WARN: Could not find tray controller class — skipping Linux tray power-monitor refresh patch");
    }
  }
  const canRecoverLinuxTray =
    canSetLinuxTrayContextMenu && patchedSource.includes("codexLinuxSetTrayController=");

  const trayClickNeedle =
    "this.tray.on(`click`,()=>{this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})}";
  const trayClickPatchWithoutContextSetup =
    "this.tray.on(`click`,()=>{process.platform===`linux`?this.openNativeTrayMenu():this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})}";
  const trayClickPatchWithContextSetup =
    "process.platform===`linux`&&this.setLinuxTrayContextMenu(),this.tray.on(`click`,()=>{process.platform===`linux`?this.openNativeTrayMenu():this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})}";
  const trayClickPatch =
    "process.platform===`linux`&&(codexLinuxSetTrayController(this),this.setLinuxTrayContextMenu()),this.tray.on(`click`,()=>{process.platform===`linux`?this.openNativeTrayMenu():this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})}";
  if (patchedSource.includes("process.platform===`linux`&&(codexLinuxSetTrayController(this),this.setLinuxTrayContextMenu()),this.tray.on(`click`")) {
    // Already patched.
  } else if (patchedSource.includes(trayClickPatchWithContextSetup)) {
    if (canRecoverLinuxTray) {
      patchedSource = patchedSource.replace(trayClickPatchWithContextSetup, trayClickPatch);
    }
  } else if (patchedSource.includes(trayClickNeedle)) {
    patchedSource = patchedSource.replace(
      trayClickNeedle,
      canRecoverLinuxTray
        ? trayClickPatch
        : canSetLinuxTrayContextMenu
          ? trayClickPatchWithContextSetup
          : trayClickPatchWithoutContextSetup,
    );
  } else if (canSetLinuxTrayContextMenu && patchedSource.includes(trayClickPatchWithoutContextSetup)) {
    patchedSource = patchedSource.replace(
      trayClickPatchWithoutContextSetup,
      canRecoverLinuxTray ? trayClickPatch : trayClickPatchWithContextSetup,
    );
  } else {
    console.warn("WARN: Could not find tray click handler — skipping Linux tray menu click patch");
  }

  const trayMenuBuildNeedle =
    `openNativeTrayMenu(){this.updateChronicleTrayIcon();let e=${electronVar}.Menu.buildFromTemplate(this.getNativeTrayMenuItems());`;
  const trayMenuBuildExistingPatch =
    `openNativeTrayMenu(){this.updateChronicleTrayIcon();let e=process.platform===\`linux\`&&this.setLinuxTrayContextMenu?this.setLinuxTrayContextMenu():${electronVar}.Menu.buildFromTemplate(this.getNativeTrayMenuItems());`;
  const trayMenuBuildPatch =
    `openNativeTrayMenu(){if(process.platform===\`linux\`&&(typeof codexLinuxIsQuitInProgress===\`function\`&&codexLinuxIsQuitInProgress()))return;this.updateChronicleTrayIcon();let e=process.platform===\`linux\`&&this.setLinuxTrayContextMenu?this.setLinuxTrayContextMenu():${electronVar}.Menu.buildFromTemplate(this.getNativeTrayMenuItems());`;
  const trayMenuBuildAnyAliasRegex =
    /openNativeTrayMenu\(\)\{this\.updateChronicleTrayIcon\(\);let e=([A-Za-z_$][\w$]*)\.Menu\.buildFromTemplate\(this\.getNativeTrayMenuItems\(\)\);/;
  const trayMenuBuildExistingAnyAliasRegex =
    /openNativeTrayMenu\(\)\{this\.updateChronicleTrayIcon\(\);let e=process\.platform===`linux`&&this\.setLinuxTrayContextMenu\?this\.setLinuxTrayContextMenu\(\):([A-Za-z_$][\w$]*)\.Menu\.buildFromTemplate\(this\.getNativeTrayMenuItems\(\)\);/;
  if (patchedSource.includes("openNativeTrayMenu(){if(process.platform===`linux`&&(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress()))return;")) {
    // Already patched.
  } else if (patchedSource.includes(trayMenuBuildExistingPatch)) {
    patchedSource = patchedSource.replace(trayMenuBuildExistingPatch, trayMenuBuildPatch);
  } else if (trayMenuBuildExistingAnyAliasRegex.test(patchedSource)) {
    patchedSource = patchedSource.replace(trayMenuBuildExistingAnyAliasRegex, trayMenuBuildPatch);
  } else if (patchedSource.includes(trayMenuBuildNeedle)) {
    patchedSource = patchedSource.replace(trayMenuBuildNeedle, trayMenuBuildPatch);
  } else if (trayMenuBuildAnyAliasRegex.test(patchedSource)) {
    patchedSource = patchedSource.replace(trayMenuBuildAnyAliasRegex, trayMenuBuildPatch);
  } else {
    console.warn("WARN: Could not find tray native menu builder — skipping Linux tray context menu builder patch");
  }

  const trayContextMenuNeedle =
    "e.once(`menu-will-show`,()=>{this.isNativeTrayMenuOpen=!0}),e.once(`menu-will-close`,()=>{this.isNativeTrayMenuOpen=!1,this.handleNativeTrayMenuClosed()}),this.tray.popUpContextMenu(e)}";
  const trayContextMenuPatch =
    "if(process.platform===`linux`)return;e.once(`menu-will-show`,()=>{this.isNativeTrayMenuOpen=!0}),e.once(`menu-will-close`,()=>{this.isNativeTrayMenuOpen=!1,this.handleNativeTrayMenuClosed()}),this.tray.popUpContextMenu(e)}";
  if (patchedSource.includes("if(process.platform===`linux`)return;e.once(`menu-will-show`")) {
    // Already patched.
  } else if (patchedSource.includes(trayContextMenuNeedle)) {
    patchedSource = patchedSource.replace(trayContextMenuNeedle, trayContextMenuPatch);
  } else {
    console.warn("WARN: Could not find tray native menu popup — skipping Linux tray popup guard patch");
  }

  const trayMenuThreadsNeedle =
    "case`tray-menu-threads-changed`:this.trayMenuThreads=e.trayMenuThreads;return";
  const trayMenuThreadsPatch =
    "case`tray-menu-threads-changed`:this.trayMenuThreads=e.trayMenuThreads,process.platform===`linux`&&!(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress())&&this.setLinuxTrayContextMenu?.();return";
  if (patchedSource.includes("this.trayMenuThreads=e.trayMenuThreads,process.platform===`linux`&&!(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress())&&this.setLinuxTrayContextMenu?.()")) {
    // Already patched.
  } else if (patchedSource.includes(trayMenuThreadsNeedle)) {
    patchedSource = patchedSource.replace(trayMenuThreadsNeedle, trayMenuThreadsPatch);
  } else {
    console.warn("WARN: Could not find tray menu thread update handler — skipping Linux tray context refresh patch");
  }

  const trayEnabledExpression = "process.platform===`linux`&&(typeof codexLinuxIsTrayEnabled!==`function`||codexLinuxIsTrayEnabled())";
  const traySetup = findDynamicTraySetup(patchedSource);
  const dynamicTrayStartupMatch = traySetup == null
    ? null
    : findDynamicTrayStartupCall(patchedSource, traySetup.setupFn, traySetup.index);
  if (
    traySetup != null &&
    patchedSource.includes(`${trayEnabledExpression})&&${traySetup.setupFn}();`)
  ) {
    // Already patched.
  } else if (dynamicTrayStartupMatch != null) {
    const isWindowsVar = dynamicTrayStartupMatch[1];
    patchedSource = `${patchedSource.slice(0, dynamicTrayStartupMatch.index)}(${isWindowsVar}||${trayEnabledExpression})&&${traySetup.setupFn}();${patchedSource.slice(dynamicTrayStartupMatch.index + dynamicTrayStartupMatch[0].length)}`;
  } else {
    console.warn("WARN: Could not find tray startup call — skipping Linux tray startup patch");
  }

  const traySetupForRegistration = findDynamicTraySetup(patchedSource);
  const sourceWithTrayRegistration = registerDynamicLinuxTrayInstance(
    patchedSource,
    traySetupForRegistration,
  );
  if (
    sourceWithTrayRegistration === patchedSource &&
    !patchedSource.includes("codexLinuxRegisterTray(") &&
    (traySetupForRegistration != null || patchedSource.includes(".Tray("))
  ) {
    console.warn("WARN: Could not register Linux tray instance — skipping Linux tray teardown patch");
  }
  patchedSource = sourceWithTrayRegistration;

  const traySetupForDiagnostics = findDynamicTraySetup(patchedSource);
  const sourceWithTrayDiagnostics = addDynamicTraySetupFailureLogging(
    patchedSource,
    traySetupForDiagnostics,
  );
  if (
    traySetupForDiagnostics != null &&
    sourceWithTrayDiagnostics === patchedSource &&
    !patchedSource.includes("[codex-linux] Failed to set up system tray")
  ) {
    console.warn("WARN: Could not find tray setup catch handler — skipping Linux tray diagnostics patch");
  }
  patchedSource = sourceWithTrayDiagnostics;

  return patchedSource;
}

function applyLinuxSingleInstancePatch(currentSource) {
  let patchedSource = currentSource;

  const singleInstanceLockNeedle =
    "agentRunId:process.env.CODEX_ELECTRON_AGENT_RUN_ID?.trim()||null}});let A=Date.now();await n.app.whenReady()";
  const singleInstanceLockPatch =
    "agentRunId:process.env.CODEX_ELECTRON_AGENT_RUN_ID?.trim()||null}});if(process.platform===`linux`&&process.env.CODEX_LINUX_MULTI_LAUNCH!==`1`&&!n.app.requestSingleInstanceLock()){n.app.quit();return}let A=Date.now();await n.app.whenReady()";
  const unguardedSingleInstanceLock =
    "process.platform===`linux`&&!n.app.requestSingleInstanceLock()";
  const guardedSingleInstanceLock =
    "process.platform===`linux`&&process.env.CODEX_LINUX_MULTI_LAUNCH!==`1`&&!n.app.requestSingleInstanceLock()";
  if (patchedSource.includes(guardedSingleInstanceLock)) {
    // Already patched.
  } else if (patchedSource.includes(unguardedSingleInstanceLock)) {
    patchedSource = patchedSource.replaceAll(unguardedSingleInstanceLock, guardedSingleInstanceLock);
  } else if (patchedSource.includes(singleInstanceLockNeedle)) {
    patchedSource = patchedSource.replace(singleInstanceLockNeedle, singleInstanceLockPatch);
  } else if (patchedSource.includes("setSecondInstanceArgsHandler")) {
    // Newer bundles take the single-instance lock in bootstrap.js and hand args into main here.
  } else {
    console.warn("WARN: Could not find startup handoff point — skipping Linux single-instance lock patch");
  }

  const secondInstanceHandlerNeedle =
    "l(e=>{R.deepLinks.queueProcessArgs(e)||ie()});let ae=";
  const secondInstanceHandlerExistingPatch =
    "let codexLinuxSecondInstanceHandler=(e,t)=>{R.deepLinks.queueProcessArgs(t)||ie()};process.platform===`linux`&&(n.app.on(`second-instance`,codexLinuxSecondInstanceHandler),k.add(()=>{n.app.off(`second-instance`,codexLinuxSecondInstanceHandler)})),l(e=>{R.deepLinks.queueProcessArgs(e)||ie()});let ae=";
  const secondInstanceHandlerPatch =
    "let codexLinuxSecondInstanceHandler=(e,t)=>{(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress())?void 0:R.deepLinks.queueProcessArgs(t)||ie()},codexLinuxBeforeQuitHandler=()=>{typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress()};process.platform===`linux`&&(n.app.on(`before-quit`,codexLinuxBeforeQuitHandler),k.add(()=>{n.app.off(`before-quit`,codexLinuxBeforeQuitHandler)}),n.app.on(`second-instance`,codexLinuxSecondInstanceHandler),k.add(()=>{n.app.off(`second-instance`,codexLinuxSecondInstanceHandler)})),l(e=>{R.deepLinks.queueProcessArgs(e)||ie()});let ae=";
  if (
    patchedSource.includes("codexLinuxBeforeQuitHandler=()=>{typeof codexLinuxMarkQuitInProgress===`function`&&codexLinuxMarkQuitInProgress()}") &&
    patchedSource.includes("(typeof codexLinuxIsQuitInProgress===`function`&&codexLinuxIsQuitInProgress())?void 0:R.deepLinks.queueProcessArgs(t)||ie()")
  ) {
    // Already patched.
  } else if (patchedSource.includes(secondInstanceHandlerExistingPatch)) {
    patchedSource = patchedSource.replace(secondInstanceHandlerExistingPatch, secondInstanceHandlerPatch);
  } else if (patchedSource.includes(secondInstanceHandlerNeedle)) {
    patchedSource = patchedSource.replace(secondInstanceHandlerNeedle, secondInstanceHandlerPatch);
  } else if (patchedSource.includes("setSecondInstanceArgsHandler")) {
    // bootstrap.js owns the Electron second-instance event and calls this bundle's handler.
  } else {
    console.warn("WARN: Could not find second-instance handler — skipping Linux second-instance focus patch");
  }

  return patchedSource;
}

module.exports = {
  applyLinuxSingleInstancePatch,
  applyLinuxTrayPatch,
};
