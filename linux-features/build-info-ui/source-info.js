#!/usr/bin/env node
"use strict";

const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function runGit(repoDir, args) {
  const result = childProcess.spawnSync("git", ["-C", repoDir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return null;
  const value = result.stdout.trim();
  return value.length > 0 ? value : null;
}

function readObject(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return value != null && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function sanitizeRemote(remote) {
  if (remote == null) return null;
  const value = String(remote).trim();
  if (value.length === 0 || path.isAbsolute(value) || value.startsWith("./") || value.startsWith("../")) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "file:") return null;
    if (["git:", "git+ssh:", "http:", "https:", "ssh:"].includes(url.protocol)) {
      url.username = "";
      url.password = "";
      return url.toString();
    }
    return null;
  } catch {
    const scpMatch = value.match(/^(?:[^@/:]+@)?([^@/:]+):([^\s]+)$/);
    return scpMatch == null ? null : `ssh://${scpMatch[1]}/${scpMatch[2]}`;
  }
  return value;
}

function githubCommitUrl(remote, commit) {
  const sha = typeof commit === "string" ? commit.trim() : "";
  if (!/^[0-9a-f]{7,40}$/i.test(sha)) return null;
  const value = sanitizeRemote(remote);
  if (value == null) return null;

  let ownerAndRepo = null;
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    ownerAndRepo = url.pathname.replace(/^\/+/, "");
  } catch {
    const match = value.match(/^(?:[^@]+@)?github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i);
    if (match) ownerAndRepo = match[1];
  }
  if (ownerAndRepo == null) return null;
  ownerAndRepo = ownerAndRepo.replace(/\/+$/, "").replace(/\.git$/i, "");
  if (!/^[^/\s]+\/[^/\s]+$/.test(ownerAndRepo)) return null;
  return `https://github.com/${ownerAndRepo}/commit/${sha}`;
}

function captureSourceInfo(repoDir, env = process.env) {
  const staged = readObject(path.join(repoDir, ".codex-linux", "features", "build-info-ui", "source-info.json"));
  const core = readObject(path.join(repoDir, ".codex-linux", "source-info.json"));
  const insideWorkTree = runGit(repoDir, ["rev-parse", "--is-inside-work-tree"]) === "true";
  const commit = env.CODEX_LINUX_SOURCE_COMMIT?.trim()
    || staged?.commit
    || core?.commit
    || (insideWorkTree ? runGit(repoDir, ["rev-parse", "HEAD"]) : null);
  const remote = sanitizeRemote(
    env.CODEX_LINUX_SOURCE_REMOTE?.trim()
      || staged?.remote
      || core?.remote
      || (insideWorkTree ? runGit(repoDir, ["remote", "get-url", "origin"]) : null),
  );
  const commitMessage = env.CODEX_LINUX_SOURCE_COMMIT_MESSAGE?.trim()
    || staged?.commitMessage
    || (insideWorkTree && commit ? runGit(repoDir, ["log", "-1", "--format=%s", commit]) : null);
  return {
    commit,
    shortCommit: commit == null ? null : commit.slice(0, 12),
    commitMessage: commitMessage || null,
    remote,
    commitUrl: githubCommitUrl(remote, commit),
    provenance: env.CODEX_LINUX_SOURCE_PROVENANCE?.trim()
      || staged?.provenance
      || core?.provenance
      || (insideWorkTree ? "git" : "unknown"),
  };
}

function writeSourceInfo(repoDir, outputPath, env = process.env) {
  const info = captureSourceInfo(repoDir, env);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(info, null, 2)}\n`, "utf8");
  return info;
}

if (require.main === module) {
  const [repoDir, outputPath] = process.argv.slice(2);
  if (!repoDir || !outputPath) {
    console.error("Usage: source-info.js REPO_DIR OUTPUT_PATH");
    process.exit(2);
  }
  writeSourceInfo(repoDir, outputPath);
}

module.exports = {
  captureSourceInfo,
  githubCommitUrl,
  sanitizeRemote,
  writeSourceInfo,
};
