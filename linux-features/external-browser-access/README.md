# External Browser Access

This opt-in feature lets Codex sessions that the desktop app did not start use
Browser Use again. That includes the standalone `codex` CLI, `codex exec`, and
third-party `codex app-server` hosts such as T3 Code or Paseo.

Since official 26.1023, the desktop app wraps the generated `cua_repl` MCP
launcher in

```sh
export BROWSER_USE_ACCESS_EXECUTOR_ID="${BROWSER_USE_ACCESS_EXECUTOR_ID-}"; exec "$@"
```

The browser service checks access whenever that variable is defined, even if
it is empty. The check needs `BROWSER_USE_ACCESS_PIPE_PATH` and
`BROWSER_USE_ACCESS_VERIFYING_IDENTITY`, which only the desktop app provides,
so every external session fails with "The browser access host is
unavailable" before it reaches Chrome
([openai/codex#57641](https://github.com/openai/codex/issues/57641)).

The patch removes only that `export` from the generated launcher:

- Desktop threads still get a non-empty executor ID through their per-thread
  `mcp_servers.*.env` overrides, so the desktop access check still applies to
  them.
- External sessions leave the variable unset, so the browser service skips the
  check. This was the behavior before 26.1023.

The launcher is written to the shared `CODEX_HOME` plugin cache
(`plugins/cache/openai-bundled/unified-computer-use/<version>/.mcp.json`) each
time the desktop app starts. After you rebuild, launch the app once so that
file is regenerated. Then restart the external sessions or reset their
`cua_repl` tool.

## Tradeoff

External sessions drive the connected browser without the desktop app's
per-turn access verification, exactly as they did before 26.1023. Enable this
only on machines where every process that can reach the shared `CODEX_HOME` is
trusted with your browser.

## Enable

```json
{
  "enabled": [
    "external-browser-access"
  ]
}
```

NixOS and Home Manager users can add the feature ID to `linuxFeatures`:

```nix
programs.codexDesktopLinux.linuxFeatures = [
  "external-browser-access"
];
```

## Tests

```bash
node --test linux-features/external-browser-access/test.js
```
