/**
 * Single source of truth for all files and hook configurations
 * distributed by claude-autopilot.
 */

const path = require("path");

const TAG = "__claude-autopilot__";

const PKG_ROOT = path.resolve(__dirname, "..");

/** Static files to copy (source relative to package root → dest relative to ~/.claude/) */
const FILES = {
  commands: [
    { src: "commands/plan.md", dest: "commands/plan.md" },
    { src: "commands/build.md", dest: "commands/build.md" },
    { src: "commands/verify.md", dest: "commands/verify.md" },
    { src: "commands/fix.md", dest: "commands/fix.md" },
  ],
  rules: [
    { src: "rules/spec-workflow.md", dest: "rules/spec-workflow.md" },
    { src: "rules/tdd-enforcement.md", dest: "rules/tdd-enforcement.md" },
    {
      src: "rules/context-continuation.md",
      dest: "rules/context-continuation.md",
    },
    {
      src: "rules/verification-checklist.md",
      dest: "rules/verification-checklist.md",
    },
  ],
  hooks: {
    core: [
      {
        src: "hooks/core/autopilot-approver.js",
        dest: "hooks/autopilot/autopilot-approver.js",
      },
      {
        src: "hooks/core/tdd-enforcer.js",
        dest: "hooks/autopilot/tdd-enforcer.js",
      },
      {
        src: "hooks/core/build-guard.js",
        dest: "hooks/autopilot/build-guard.js",
      },
    ],
    optional: [
      {
        src: "hooks/optional/lint-check.js",
        dest: "hooks/autopilot/lint-check.js",
      },
      {
        src: "hooks/optional/stop-guard.js",
        dest: "hooks/autopilot/stop-guard.js",
      },
      {
        src: "hooks/optional/context-monitor.js",
        dest: "hooks/autopilot/context-monitor.js",
      },
    ],
  },
};

/**
 * Hook configuration entries for settings.json.
 * Each entry specifies the event, matcher (optional), and hook properties.
 * The `dest` field is used to build the `command` path at install time.
 */
const HOOK_CONFIGS = {
  core: [
    {
      event: "PreToolUse",
      matcher: "Write|Edit|Bash",
      dest: "hooks/autopilot/autopilot-approver.js",
      timeout: 5,
    },
    {
      event: "PostToolUse",
      matcher: "Write|Edit",
      dest: "hooks/autopilot/tdd-enforcer.js",
      timeout: 10,
    },
    {
      event: "Stop",
      matcher: null,
      dest: "hooks/autopilot/build-guard.js",
      timeout: 10,
    },
  ],
  optional: [
    {
      event: "PostToolUse",
      matcher: "Write|Edit",
      dest: "hooks/autopilot/lint-check.js",
      timeout: 30,
    },
    {
      event: "Stop",
      matcher: null,
      dest: "hooks/autopilot/stop-guard.js",
      timeout: 15,
    },
    {
      event: "PostToolUse",
      matcher: "Write|Edit|Bash",
      dest: "hooks/autopilot/context-monitor.js",
      timeout: 5,
      async: true,
    },
  ],
};

/** Get absolute source path for a file entry */
function srcPath(entry) {
  return path.join(PKG_ROOT, entry.src);
}

/** Get all file entries as a flat list */
function allFiles(includeOptional = true) {
  const files = [...FILES.commands, ...FILES.rules, ...FILES.hooks.core];
  if (includeOptional) {
    files.push(...FILES.hooks.optional);
  }
  return files;
}

/** Get all hook configs as a flat list */
function allHookConfigs(includeOptional = true) {
  const configs = [...HOOK_CONFIGS.core];
  if (includeOptional) {
    configs.push(...HOOK_CONFIGS.optional);
  }
  return configs;
}

module.exports = {
  TAG,
  PKG_ROOT,
  FILES,
  HOOK_CONFIGS,
  srcPath,
  allFiles,
  allHookConfigs,
};
