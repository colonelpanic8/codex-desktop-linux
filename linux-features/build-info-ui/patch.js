"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { requireName } = require("../../scripts/patches/lib/minified-js.js");

const settingsAssets = [
  "keybinds-settings-linux.js",
  "linux-desktop-settings-linux.js",
];

function buildInfoMainHelpers(electronVar, fsVar, pathVar) {
  return `function codexLinuxBuildInfoFeatureReadJson(__codexBuildInfoPath){try{if(${fsVar}.existsSync(__codexBuildInfoPath)){let __codexBuildInfoValue=JSON.parse(${fsVar}.readFileSync(__codexBuildInfoPath,\`utf8\`));if(__codexBuildInfoValue&&typeof __codexBuildInfoValue===\`object\`&&!Array.isArray(__codexBuildInfoValue))return __codexBuildInfoValue}}catch{}return null}
function codexLinuxBuildInfoFeatureGet(){let __codexBuildInfoPaths=[],__codexBuildInfo=null,__codexBuildInfoPath=null,__codexBuildInfoFeature=null;try{__codexBuildInfoPaths=[(0,${pathVar}.join)(process.resourcesPath,\`codex-linux-build-info.json\`),(0,${pathVar}.join)(process.resourcesPath,\`..\`,\`.codex-linux\`,\`build-info.json\`)];let __codexBuildInfoFeaturePath=(0,${pathVar}.join)(process.resourcesPath,\`..\`,\`.codex-linux\`,\`features\`,\`build-info-ui\`,\`source-info.json\`);__codexBuildInfoFeature=codexLinuxBuildInfoFeatureReadJson(__codexBuildInfoFeaturePath)}catch{}for(let __codexBuildInfoCandidate of __codexBuildInfoPaths){__codexBuildInfo=codexLinuxBuildInfoFeatureReadJson(__codexBuildInfoCandidate);if(__codexBuildInfo){__codexBuildInfoPath=__codexBuildInfoCandidate;break}}if(__codexBuildInfo&&__codexBuildInfoFeature)__codexBuildInfo={...__codexBuildInfo,source:{...(__codexBuildInfo.source??{}),...__codexBuildInfoFeature}};let __codexBuildInfoCommitUrl=__codexBuildInfoFeature?.commitUrl;__codexBuildInfoCommitUrl=typeof __codexBuildInfoCommitUrl===\`string\`&&/^https:\\/\\/github\\.com\\/[^/\\s]+\\/[^/\\s]+\\/commit\\/[0-9a-f]{7,40}$/i.test(__codexBuildInfoCommitUrl)?__codexBuildInfoCommitUrl:null;return{info:__codexBuildInfo,path:__codexBuildInfoPath,commitUrl:__codexBuildInfoCommitUrl}}
function codexLinuxBuildInfoFeatureValue(__codexBuildInfoValue,__codexBuildInfoFallback=\`unknown\`){return typeof __codexBuildInfoValue===\`string\`&&__codexBuildInfoValue.trim().length>0?__codexBuildInfoValue:Array.isArray(__codexBuildInfoValue)&&__codexBuildInfoValue.length>0?__codexBuildInfoValue.join(\`, \`):__codexBuildInfoValue==null?__codexBuildInfoFallback:String(__codexBuildInfoValue)}
function codexLinuxBuildInfoFeatureRows(__codexBuildInfoResult){let __codexBuildInfo=__codexBuildInfoResult.info;if(!__codexBuildInfo)return[[\`Metadata file\`,\`not found\`]];let __codexBuildInfoTarget=__codexBuildInfo.linuxTarget??{},__codexBuildInfoDistro=__codexBuildInfoTarget.distro??{},__codexBuildInfoDmg=__codexBuildInfo.upstreamDmg??{},__codexBuildInfoSource=__codexBuildInfo.source??{},__codexBuildInfoFeatures=__codexBuildInfo.linuxFeatures?.enabled??[],__codexBuildInfoProfile=__codexBuildInfo.packageProfile??{},__codexBuildInfoCommit=__codexBuildInfoSource.commit||__codexBuildInfoSource.shortCommit||\`unknown\`,__codexBuildInfoCommitValue=__codexBuildInfoSource.dirty?\`\${__codexBuildInfoCommit} (dirty)\`:__codexBuildInfoCommit,__codexBuildInfoDistroValue=__codexBuildInfoDistro.prettyName||[__codexBuildInfoDistro.id,__codexBuildInfoDistro.versionId].filter(Boolean).join(\` \`)||\`unknown\`;return[[\`Metadata file\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoResult.path),__codexBuildInfoResult.path?\`#metadata\`:null],[\`Linux package profile\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoProfile.label)],[\`Distro\`,__codexBuildInfoDistroValue],[\`Package manager\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoTarget.packageManager??__codexBuildInfoProfile.packageManager)],[\`Package format\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoTarget.packageFormat??__codexBuildInfoProfile.format)],[\`Enabled features\`,__codexBuildInfoFeatures.length>0?__codexBuildInfoFeatures.join(\`, \`):\`none\`],[\`Upstream app version\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoDmg.appVersion)],[\`Electron\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfo.electronVersion)],[\`Linux source commit\`,__codexBuildInfoCommitValue,__codexBuildInfoResult.commitUrl],[\`Commit subject\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoSource.commitMessage,\`unavailable\`)],[\`Source branch\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoSource.branch)],[\`Generated\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfo.generatedAt)],[\`Upstream DMG SHA256\`,codexLinuxBuildInfoFeatureValue(__codexBuildInfoDmg.sha256)]]}
function codexLinuxBuildInfoFeatureEscape(__codexBuildInfoValue){return String(__codexBuildInfoValue??\`\`).replace(/[&<>"']/g,__codexBuildInfoCharacter=>({"&":\`&amp;\`,"<":\`&lt;\`,">":\`&gt;\`,"\\\"":\`&quot;\`,"'":\`&#39;\`})[__codexBuildInfoCharacter])}
function codexLinuxBuildInfoFeatureDocument(__codexBuildInfoResult){let __codexBuildInfoRows=codexLinuxBuildInfoFeatureRows(__codexBuildInfoResult),__codexBuildInfoHtml=__codexBuildInfoRows.map(([__codexBuildInfoLabel,__codexBuildInfoValue,__codexBuildInfoHref])=>{let __codexBuildInfoContent=__codexBuildInfoHref?\`<a href="\${codexLinuxBuildInfoFeatureEscape(__codexBuildInfoHref)}" target="_blank" rel="noreferrer">\${codexLinuxBuildInfoFeatureEscape(__codexBuildInfoValue)}</a>\`:\`<code>\${codexLinuxBuildInfoFeatureEscape(__codexBuildInfoValue)}</code>\`;return\`<dt>\${codexLinuxBuildInfoFeatureEscape(__codexBuildInfoLabel)}</dt><dd>\${__codexBuildInfoContent}</dd>\`}).join(\`\`);return\`<!doctype html><html><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Build Information</title><style>:root{color-scheme:light dark}body{font:14px system-ui,sans-serif;margin:0;padding:28px}h1{font-size:20px;margin:0 0 20px}dl{display:grid;grid-template-columns:145px minmax(0,1fr);gap:12px 18px;margin:0}dt{color:#6b7280}dd{margin:0;min-width:0;overflow-wrap:anywhere}code,a{font:12px ui-monospace,SFMono-Regular,Consolas,monospace}a{color:#2563eb}@media(prefers-color-scheme:dark){dt{color:#9aa0a6}a{color:#8ab4f8}}</style></head><body><h1>ChatGPT Desktop for Linux</h1><dl>\${__codexBuildInfoHtml}</dl></body></html>\`}
async function codexLinuxBuildInfoFeatureOpenCommit(){let __codexBuildInfoResult=codexLinuxBuildInfoFeatureGet();return __codexBuildInfoResult.commitUrl?(await ${electronVar}.shell?.openExternal(__codexBuildInfoResult.commitUrl),{success:!0}):{success:!1}}
let codexLinuxBuildInfoFeatureWindow=null;
async function codexLinuxBuildInfoFeatureShow(){try{if(codexLinuxBuildInfoFeatureWindow&&!codexLinuxBuildInfoFeatureWindow.isDestroyed()){codexLinuxBuildInfoFeatureWindow.show(),codexLinuxBuildInfoFeatureWindow.focus();return}let __codexBuildInfoResult=codexLinuxBuildInfoFeatureGet(),__codexBuildInfoCommitUrl=__codexBuildInfoResult.commitUrl,__codexBuildInfoPath=__codexBuildInfoResult.path,__codexBuildInfoParent=${electronVar}.BrowserWindow.getFocusedWindow()??${electronVar}.BrowserWindow.getAllWindows().find(__codexBuildInfoCandidate=>__codexBuildInfoCandidate.isVisible()),__codexBuildInfoOptions={width:680,height:620,minWidth:520,minHeight:420,show:!1,title:\`Build Information\`,autoHideMenuBar:!0,webPreferences:{contextIsolation:!0,nodeIntegration:!1,sandbox:!0}};__codexBuildInfoParent&&Object.assign(__codexBuildInfoOptions,{parent:__codexBuildInfoParent,modal:!0}),codexLinuxBuildInfoFeatureWindow=new ${electronVar}.BrowserWindow(__codexBuildInfoOptions),codexLinuxBuildInfoFeatureWindow.on(\`closed\`,()=>{codexLinuxBuildInfoFeatureWindow=null});let __codexBuildInfoOpenUrl=__codexBuildInfoUrl=>{if(__codexBuildInfoCommitUrl&&__codexBuildInfoUrl===__codexBuildInfoCommitUrl){${electronVar}.shell?.openExternal(__codexBuildInfoCommitUrl);return!0}if(__codexBuildInfoPath&&__codexBuildInfoUrl.endsWith(\`#metadata\`)){${electronVar}.shell?.openPath?.(__codexBuildInfoPath);return!0}return!1};codexLinuxBuildInfoFeatureWindow.webContents.on(\`will-navigate\`,(__codexBuildInfoEvent,__codexBuildInfoUrl)=>{__codexBuildInfoEvent.preventDefault(),__codexBuildInfoOpenUrl(__codexBuildInfoUrl)}),codexLinuxBuildInfoFeatureWindow.webContents.setWindowOpenHandler(({url:__codexBuildInfoUrl})=>(__codexBuildInfoOpenUrl(__codexBuildInfoUrl),{action:\`deny\`})),await codexLinuxBuildInfoFeatureWindow.loadURL(\`data:text/html;charset=utf-8,\${encodeURIComponent(codexLinuxBuildInfoFeatureDocument(__codexBuildInfoResult))}\`),codexLinuxBuildInfoFeatureWindow.show()}catch{codexLinuxBuildInfoFeatureWindow=null}}`;
}

function buildInfoHandlerSource() {
  return `"codex-linux-get-build-info":async()=>codexLinuxBuildInfoFeatureGet(),"codex-linux-open-build-info-commit":async()=>codexLinuxBuildInfoFeatureOpenCommit(),"codex-linux-show-build-info":async()=>{await codexLinuxBuildInfoFeatureShow();return{success:!0}},`;
}

function helperInsertionIndex(source) {
  const classMatch = source.match(/var [A-Za-z_$][\w$]*=class\{[^]*?getNativeTrayMenuItems\(\)\{[^]*?return\[/);
  if (classMatch?.index != null) return classMatch.index;
  const helpMatch = source.match(/\{role:`help`,id:[A-Za-z_$][\w$]*\.(?:bn|[A-Za-z_$][\w$]*)\.help,submenu:\[/);
  if (helpMatch?.index == null) return null;
  return source.lastIndexOf(";", helpMatch.index) + 1;
}

function applyBuildInfoMainPatch(source) {
  if (source.includes("function codexLinuxBuildInfoFeatureShow()")) return source;
  const electronVar = requireName(source, "electron");
  const fsVar = requireName(source, "node:fs");
  const pathVar = requireName(source, "node:path");
  if (electronVar == null || fsVar == null || pathVar == null) {
    console.warn("WARN: Could not find build info UI module bindings — skipping feature patch");
    return source;
  }

  let patched = source;
  let trayPatched = false;
  const trayPattern = /getNativeTrayMenuItems\(\)\{[^]*?return\[/g;
  if (trayPattern.test(patched)) {
    trayPattern.lastIndex = 0;
    patched = patched.replace(trayPattern, (match) => {
      trayPatched = true;
      return `${match}...process.platform===\`linux\`?[{label:\`Build Information\`,click:()=>{codexLinuxBuildInfoFeatureShow()}},{type:\`separator\`}]:[],`;
    });
  }
  let helpPatched = false;
  const helpPattern = /\{role:`help`,id:[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*\.help,submenu:\[/g;
  patched = patched.replace(helpPattern, (match) => {
    helpPatched = true;
    return `${match}...process.platform===\`linux\`?[{label:\`Build Information\`,click:()=>{codexLinuxBuildInfoFeatureShow()}},{type:\`separator\`}]:[],`;
  });

  const handler = buildInfoHandlerSource();
  const handlerIndexes = [
    patched.indexOf("\"set-global-state\":async"),
    patched.indexOf("\"get-global-state\":async"),
  ].filter((index) => index !== -1);
  const handlerPatched = handlerIndexes.length > 0;
  if (handlerPatched && !patched.includes(handler)) {
    const index = Math.min(...handlerIndexes);
    patched = `${patched.slice(0, index)}${handler}${patched.slice(index)}`;
  }
  if (!trayPatched || !helpPatched || !handlerPatched) {
    const missing = [
      ...(trayPatched ? [] : ["tray menu"]),
      ...(helpPatched ? [] : ["Help menu"]),
      ...(handlerPatched ? [] : ["IPC handler table"]),
    ];
    console.warn(`WARN: Could not find build info UI ${missing.join(", ")} integration — skipping feature patch`);
    return source;
  }

  const insertionIndex = helperInsertionIndex(patched);
  if (insertionIndex == null) {
    console.warn("WARN: Could not find build info UI helper insertion point — skipping feature patch");
    return source;
  }
  return `${patched.slice(0, insertionIndex)}${buildInfoMainHelpers(electronVar, fsVar, pathVar)};${patched.slice(insertionIndex)}`;
}

function buildInfoSettingsSource() {
  return `function codexLinuxBuildInfoValue(value,fallback="unknown"){return typeof value=="string"&&value.trim().length>0?value:Array.isArray(value)&&value.length>0?value.join(", "):value==null?fallback:String(value)}function codexLinuxBuildInfoRows(payload){let info=payload?.info;if(!info)return [["Metadata file",codexLinuxBuildInfoValue(payload?.path,"not found")]];let target=info.linuxTarget??{},distro=target.distro??{},dmg=info.upstreamDmg??{},source=info.source??{},features=info.linuxFeatures?.enabled??[],profile=info.packageProfile??{},commit=source.commit||source.shortCommit||"",commitValue=commit?source.dirty?commit+" (dirty)":commit:"unknown",distroValue=distro.prettyName||[distro.id,distro.versionId].filter(Boolean).join(" ")||"unknown";return [["Metadata file",codexLinuxBuildInfoValue(payload?.path)],["Linux package profile",codexLinuxBuildInfoValue(profile.label)],["Linux source commit",commitValue,payload?.commitUrl],["Commit subject",codexLinuxBuildInfoValue(source.commitMessage,"unavailable")],["Source branch",codexLinuxBuildInfoValue(source.branch)],["Generated",codexLinuxBuildInfoValue(info.generatedAt)],["Distro",distroValue],["Package manager",codexLinuxBuildInfoValue(target.packageManager??profile.packageManager)],["Package format",codexLinuxBuildInfoValue(target.packageFormat??profile.format)],["Enabled features",features.length>0?features.join(", "):"none"],["Upstream app version",codexLinuxBuildInfoValue(dmg.appVersion)],["Electron",codexLinuxBuildInfoValue(info.electronVersion)],["Upstream DMG SHA256",codexLinuxBuildInfoValue(dmg.sha256)]].filter(row=>row[1]!=null)}class LinuxBuildInfoPanel extends React.Component{constructor(props){super(props),this._alive=!1,this.state={data:null,isLoading:!0,error:null,copied:!1},this.load=this.load.bind(this),this.copyCommit=this.copyCommit.bind(this),this.openCommit=this.openCommit.bind(this),this.showDetails=this.showDetails.bind(this),this.fail=this.fail.bind(this)}componentDidMount(){this._alive=!0,this.load()}componentWillUnmount(){this._alive=!1}fail(error){this._alive&&this.setState({error:error instanceof Error?error.message:String(error)})}load(){this.setState({isLoading:!0,error:null}),__post("codex-linux-get-build-info",{}).then(data=>{this._alive&&this.setState({data})}).catch(this.fail).finally(()=>{this._alive&&this.setState({isLoading:!1})})}copyCommit(){let commit=this.state.data?.info?.source?.commit||"";commit&&navigator.clipboard?.writeText(commit).then(()=>{this._alive&&this.setState({copied:!0})}).catch(this.fail)}openCommit(){this.state.data?.commitUrl&&__post("codex-linux-open-build-info-commit",{}).catch(this.fail)}showDetails(){__post("codex-linux-show-build-info",{}).catch(this.fail)}render(){let{data,isLoading,error,copied}=this.state,commit=data?.info?.source?.commit||"",commitUrl=data?.commitUrl||"",rows=codexLinuxBuildInfoRows(data),buttonClass="h-8 cursor-pointer rounded-md border border-token-border-default px-3 text-sm text-token-text-primary disabled:opacity-60",description=isLoading?$.jsx("span",{children:"Loading build metadata..."}):$.jsxs("div",{className:"flex flex-col gap-2 text-sm",children:[$.jsx("dl",{className:"grid gap-x-4 gap-y-3 rounded-md border border-token-border-default bg-token-bg-secondary p-3 sm:grid-cols-[150px_minmax(0,1fr)]",children:rows.map(([label,value,url])=>$.jsxs(React.Fragment,{children:[$.jsx("dt",{className:"text-token-text-tertiary",children:label}),$.jsx("dd",{className:"min-w-0",children:$.jsxs("div",{className:"flex min-w-0 flex-col items-start gap-2",children:[url?$.jsx("a",{href:url,onClick:event=>{event.preventDefault(),this.openCommit()},className:"select-text break-all font-mono text-xs underline",children:value}):$.jsx("code",{className:"select-text break-all text-xs",children:value}),label==="Metadata file"?$.jsx("button",{type:"button",className:buttonClass,onClick:this.showDetails,children:"Details"}):label==="Linux source commit"?$.jsxs("div",{className:"flex gap-2",children:[$.jsx("button",{type:"button",className:buttonClass,disabled:!commit,onClick:this.copyCommit,children:"Copy commit"}),$.jsx("button",{type:"button",className:buttonClass,disabled:!commitUrl,onClick:this.openCommit,children:"Open on GitHub"})]}):null]})})]},label)})}),error?$.jsx("span",{className:"text-token-error-foreground",children:error}):null,copied?$.jsx("span",{children:"Commit copied"}):null]});return $.jsx(SettingsRow,{label:"Build information",description,control:null})}}function LinuxBuildInfoSettingsExtension({mode}){return mode==="group"?$.jsx(LinuxBuildInfoPanel,{}):$.jsxs(SettingsSection,{className:"gap-2",children:[$.jsx(SettingsSection.Header,{title:"Build"}),$.jsx(SettingsSection.Content,{children:$.jsx(SettingsGroup,{children:$.jsx(LinuxBuildInfoPanel,{})})})]})}`;
}

function applyBuildInfoSettingsSource(source) {
  const disabledMarker = "var LinuxDesktopSettingsExtensions=[];";
  if (source.includes("LinuxDesktopSettingsExtensions=[LinuxBuildInfoSettingsExtension]")) return source;
  if (!source.includes(disabledMarker)) {
    console.warn("WARN: Could not find Linux settings extension point — skipping build info UI settings patch");
    return source;
  }
  return source.replace(
    disabledMarker,
    `${buildInfoSettingsSource()}var LinuxDesktopSettingsExtensions=[LinuxBuildInfoSettingsExtension];`,
  );
}

function patchBuildInfoSettingsAssets(extractedDir) {
  const assetsDir = path.join(extractedDir, "webview", "assets");
  let matched = 0;
  let changed = false;
  for (const asset of settingsAssets) {
    const filePath = path.join(assetsDir, asset);
    if (!fs.existsSync(filePath)) continue;
    matched += 1;
    const source = fs.readFileSync(filePath, "utf8");
    const patched = applyBuildInfoSettingsSource(source);
    if (patched !== source) {
      fs.writeFileSync(filePath, patched, "utf8");
      changed = true;
    }
  }
  if (matched === 0) {
    console.warn("WARN: Could not find generated Linux settings assets — skipping build info UI settings patch");
  }
  return {
    changed,
    matched,
    reason: matched === 0 ? "generated Linux settings assets were not found" : null,
  };
}

module.exports = {
  applyBuildInfoMainPatch,
  applyBuildInfoSettingsSource,
  buildInfoMainHelpers,
  descriptors: [
    {
      id: "main-process",
      phase: "main-bundle",
      order: 20115,
      ciPolicy: "optional",
      apply: applyBuildInfoMainPatch,
    },
    {
      id: "settings",
      phase: "extracted-app:post-webview",
      order: 22030,
      ciPolicy: "optional",
      apply: patchBuildInfoSettingsAssets,
      status: (result, warnings) => ({
        status: result?.changed
          ? warnings.length > 0 ? "applied-with-warnings" : "applied"
          : warnings.length > 0 || result?.matched === 0 ? "skipped-optional" : "already-applied",
        reason: result?.reason ?? warnings[0] ?? null,
      }),
    },
  ],
  patchBuildInfoSettingsAssets,
};
