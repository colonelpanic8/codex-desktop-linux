# Nix

Run Codex Desktop for Linux directly with:

```bash
nix run github:ilysenko/codex-desktop-linux
```

The flake handles dependencies and patches Electron for NixOS. A GitHub Actions
bot refreshes the upstream `Codex.dmg` hash and verifies the Nix package outputs
in `main`. If you hit a hash mismatch right after an upstream release, wait for
the next bot run and retry.

## Codex CLI Requirement

Codex Desktop still needs the Codex CLI at runtime. For Nix installs, prefer
installing the CLI from Nix as well, so Desktop and CLI updates can be pinned
and advanced together.

The `sadjow/codex-cli-nix` flake tracks Codex CLI releases and exposes Nix
packages for the native binary and Node.js builds:

```bash
nix run github:sadjow/codex-cli-nix/main
```

For a declarative setup, add the CLI flake as an input:

```nix
{
  inputs.codex-cli-nix = {
    # Default branch is `main` on GitHub, not `master`.
    url = "github:sadjow/codex-cli-nix/main";
    inputs = {
      nixpkgs.follows = "nixpkgs";
      flake-utils.follows = "flake-utils";
    };
  };
}
```

The flake also publishes a Cachix cache for prebuilt binaries:

```bash
cachix use codex-cli
```

For a declarative NixOS cache configuration:

```nix
{
  nix.settings = {
    substituters = [ "https://codex-cli.cachix.org" ];
    trusted-public-keys = [
      "codex-cli.cachix.org-1:1Br3H1hHoRYG22n//cGKJOk3cQXgYobUel6O8DgSing="
    ];
  };
}
```

Then install its package next to Codex Desktop from Home Manager:

```nix
{ inputs, pkgs, ... }:
let
  codexCli = inputs.codex-cli-nix.packages.${pkgs.stdenv.hostPlatform.system}.default;
in
{
  home.packages = [
    codexCli
  ];

  programs.codexDesktopLinux.enable = true;
}
```

For a NixOS module, use the same package in `environment.systemPackages`
instead of `home.packages`.

If you enable the remote-control service, point it at the same CLI package:

```nix
{ inputs, pkgs, ... }:
let
  codexCli = inputs.codex-cli-nix.packages.${pkgs.stdenv.hostPlatform.system}.default;
in
{
  programs.codexDesktopLinux = {
    enable = true;
    remoteControl = {
      enable = true;
      package = codexCli;
    };
  };
}
```

Pinning `github:sadjow/codex-cli-nix` to a release tag or commit is
recommended for fully reproducible configurations.

If your graphical session does not put the selected profile on `PATH`, set
`CODEX_CLI_PATH` to the Nix-built CLI binary:

```nix
{
  home.sessionVariables.CODEX_CLI_PATH = "${codexCli}/bin/codex";
}
```

As a fallback, you can still install the upstream npm package, then make sure
the resulting `codex` binary is on `PATH` or referenced by `CODEX_CLI_PATH`:

```bash
npm i -g @openai/codex
```

This is most useful outside Nix or while recovering from a broken flake input;
it is not the preferred path for Nix or NixOS users.

If `nix run` appears to do nothing, check the launcher log first:

```bash
sed -n '1,220p' ~/.cache/codex-desktop/launcher.log
```

## Feature Outputs

Flakes do not include the git-ignored `linux-features/features.json` opt-in
file, so Nix exposes feature-specific app variants.

Remote mobile control:

```bash
nix run github:ilysenko/codex-desktop-linux#remote-mobile-control
```

Computer Use UI plus remote mobile control:

```bash
nix run github:ilysenko/codex-desktop-linux#computer-use-ui-remote-mobile-control
```

Computer Use UI only:

```bash
nix run github:ilysenko/codex-desktop-linux#codex-desktop-computer-use-ui
```

## Home Manager / NixOS Module

For a declarative install with the mobile remote-control app-server managed by
systemd instead of the Desktop launcher:

```nix
{
  imports = [
    inputs.codex-desktop-linux.homeManagerModules.default
  ];

  programs.codexDesktopLinux = {
    enable = true;
    computerUseUi.enable = true;
    remoteMobileControl.enable = true;
    remoteControl.enable = true;
  };
}
```

This installs the selected Codex Desktop package variant and starts a user
`codex-remote-control.service` with:

```text
codex app-server --remote-control --listen unix://
```

A `nixosModules.default` export is also available for system-level
configurations that prefer a global user unit.

## Development Shell

```bash
nix develop github:ilysenko/codex-desktop-linux
```

## Cachix

CI can populate a Cachix cache named `codex-desktop-linux` for flake package
outputs. To push to the cache, create it in Cachix and add a repository secret
named `CACHIX_AUTH_TOKEN` with write access.

Users can opt in locally with:

```bash
cachix use codex-desktop-linux
```

The scheduled `Populate Cachix` workflow builds the default package,
feature-specific package variants, and `.#installer`.
