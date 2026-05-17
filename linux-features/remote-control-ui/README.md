# Remote Control UI

Opt-in Linux UI patches for upstream `remote_control` and Codex mobile surfaces.

This feature only opens the Linux UI gates. It does not fake backend state such
as connected clients, MFA completion, or remote control environments.

Enable it locally with:

```json
{
  "enabled": [
    "remote-control-ui"
  ]
}
```

For the Nix flake build, use the declarative remote-control app variant instead
because the git-ignored `features.json` file is not part of the flake source.
The Nix variant enables this UI feature together with the Linux host-enrollment
patches:

```bash
nix run .#remote-control
```

Run the feature tests with:

```bash
node --test linux-features/remote-control-ui/test.js
```
