/**
 * Cross-platform path utilities for claude-autopilot.
 * Resolves ~/.claude directories on Windows, macOS, and Linux.
 */

const path = require("path");
const os = require("os");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");

/** Resolve a path relative to ~/.claude */
function claudePath(...segments) {
  return path.join(CLAUDE_DIR, ...segments);
}

/** ~/.claude/commands/ */
function commandsDir() {
  return claudePath("commands");
}

/** ~/.claude/rules/ */
function rulesDir() {
  return claudePath("rules");
}

/** ~/.claude/hooks/autopilot/ */
function hooksDir() {
  return claudePath("hooks", "autopilot");
}

/** ~/.claude/settings.json */
function settingsPath() {
  return claudePath("settings.json");
}

/** ~/.claude/settings.json.bak */
function settingsBackupPath() {
  return claudePath("settings.json.bak");
}

/**
 * Normalize a path to forward slashes for use in settings.json commands.
 * Claude Code on Windows uses forward-slash paths in hook commands.
 */
function forwardSlash(p) {
  return p.replace(/\\/g, "/");
}

module.exports = {
  CLAUDE_DIR,
  claudePath,
  commandsDir,
  rulesDir,
  hooksDir,
  settingsPath,
  settingsBackupPath,
  forwardSlash,
};
