# Build Information UI

This optional feature adds Linux build metadata to the tray and Help menus and
to Linux desktop settings. It renders the source revision as a validated GitHub
link and shows the commit subject when that subject is available at build time.

Enable it in the git-ignored `linux-features/features.json`:

```json
{
  "enabled": ["build-info-ui"]
}
```

The feature owns its UI patches and captures link/subject metadata in
`.codex-linux/features/build-info-ui/source-info.json`. Native package hooks
preserve that file in the update-builder bundle so later local rebuilds retain
the same provenance. Disabling the feature runs its cleanup hook and removes
the feature-owned source metadata from the rebuilt app.

Nix builds have no `.git` directory. The flake therefore supplies the immutable
flake revision, the canonical repository remote, and `nix-flake` provenance.
This makes the commit link reproducible. Nix does not expose a commit subject,
so the subject is reported as unavailable unless the caller explicitly supplies
`CODEX_LINUX_SOURCE_COMMIT_MESSAGE`; the feature never invents one or performs a
network lookup during the build.

Run `node --test linux-features/build-info-ui/test.js` for focused coverage.
The feature is fail-soft against upstream bundle drift and remains disabled by
default. Its custom BrowserWindow uses an inline-only CSP, disables Node
integration, and allows navigation only to the exact validated commit URL or
the local metadata file.
