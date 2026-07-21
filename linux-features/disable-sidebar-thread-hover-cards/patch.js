"use strict";

const { escapeRegExp, findMatchingBrace } = require("../../scripts/patches/lib/minified-js.js");
const { recordStrategy } = require("../../scripts/patches/strategy-telemetry.js");

function applyDisableSidebarThreadHoverCardsPatch(currentSource) {
  const strategyGroup = "disable-sidebar-thread-hover-cards";
  let markerIndex = currentSource.indexOf("disableHoverCard:");

  while (markerIndex !== -1) {
    const functionStart = currentSource.lastIndexOf("function ", markerIndex);
    if (functionStart === -1) {
      break;
    }
    const openBrace = currentSource.indexOf("{", functionStart);
    const closeBrace = findMatchingBrace(currentSource, openBrace);
    if (openBrace === -1 || closeBrace === -1) {
      break;
    }

    const functionText = currentSource.slice(functionStart, closeBrace + 1);
    if (
      functionText.includes("shouldFetchHoverBranch:") &&
      functionText.includes("hoverCardContent:") &&
      functionText.includes("id:`codex.localTaskRow.archiveTask`")
    ) {
      const disabledPropVar = functionText.match(
        /disableHoverCard:([A-Za-z_$][\w$]*)/u,
      )?.[1];
      const disabledDefaultMatch = disabledPropVar == null
        ? null
        : functionText.match(
          new RegExp(
            `([A-Za-z_$][\\w$]*)=${escapeRegExp(disabledPropVar)}===void 0\\?!1:${escapeRegExp(disabledPropVar)}`,
            "u",
          ),
        );

      if (disabledDefaultMatch != null) {
        const patchedFunction = functionText.replace(
          disabledDefaultMatch[0],
          `${disabledDefaultMatch[1]}=!0`,
        );
        recordStrategy(strategyGroup, "upstream-local-task-row");
        return `${currentSource.slice(0, functionStart)}${patchedFunction}${currentSource.slice(closeBrace + 1)}`;
      }

      const cardDisableVar = functionText.match(
        /([A-Za-z_$][\w$]*)\?null:[A-Za-z_$][\w$]*\(\{conversationId:[\s\S]{0,3000}?shouldFetchHoverBranch:/u,
      )?.[1];
      if (
        cardDisableVar != null &&
        new RegExp(`${escapeRegExp(cardDisableVar)}=!0(?:[,;])`, "u").test(functionText)
      ) {
        recordStrategy(strategyGroup, "already-applied");
        return currentSource;
      }

      recordStrategy(strategyGroup, "none");
      console.warn(
        "WARN: Could not find sidebar thread hover card disable insertion point — skipping hover card performance feature",
      );
      return currentSource;
    }

    markerIndex = currentSource.indexOf("disableHoverCard:", markerIndex + 1);
  }

  return currentSource;
}

const descriptors = [
  {
    id: "local-thread-hover-card",
    phase: "webview-asset",
    order: 20_950,
    ciPolicy: "optional",
    pattern: /^app-initial~app-main~onboarding-page~projects-index-page~hotkey-window-thread-page~chatgpt-~.*\.js$/,
    missingDescription: "sidebar local thread row bundle",
    skipDescription: "sidebar thread hover card performance feature",
    apply: applyDisableSidebarThreadHoverCardsPatch,
  },
];

module.exports = {
  applyDisableSidebarThreadHoverCardsPatch,
  descriptors,
};
