"use strict";

const PATCH_MARKER = "/*codexLinuxExternalBrowserAccess*/";
const ORIGINAL_SCRIPT =
  /'export BROWSER_USE_ACCESS_EXECUTOR_ID="\$\{BROWSER_USE_ACCESS_EXECUTOR_ID-\}"; ?exec "\$@"'/g;
const PATCHED_SCRIPT = `${PATCH_MARKER}'exec "$@"'`;

function applyExternalBrowserAccessPatch(source) {
  const markers = source.split(PATCH_MARKER).length - 1;
  const matches = source.match(ORIGINAL_SCRIPT)?.length ?? 0;
  if (markers === 1 && matches === 0) return source;
  if (markers === 0 && matches === 1) {
    return source.replace(ORIGINAL_SCRIPT, PATCHED_SCRIPT);
  }
  console.warn(
    `WARN: Found ${matches} cua_repl browser-access bootstrap scripts and ${markers} markers` +
      " — skipping external browser access patch",
  );
  return source;
}

module.exports = {
  descriptors: [
    {
      id: "cua-repl-access-bootstrap",
      phase: "main-bundle",
      order: 20600,
      ciPolicy: "optional",
      apply: applyExternalBrowserAccessPatch,
    },
  ],
  PATCH_MARKER,
  applyExternalBrowserAccessPatch,
};
