/**
 * settings.json read/merge/remove with _tag-based identification.
 *
 * Claude Code settings.json structure:
 * {
 *   "hooks": {
 *     "PreToolUse": [
 *       { "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "...", ... }] }
 *     ],
 *     "PostToolUse": [...],
 *     "Stop": [...],
 *     ...
 *   }
 * }
 *
 * Each hook entry we add gets a `_tag: "__claude-autopilot__"` field for identification.
 */

const fs = require("fs");
const {
  settingsPath,
  settingsBackupPath,
  forwardSlash,
  claudePath,
} = require("./paths");
const { TAG } = require("./manifest");

/** Read settings.json, returning parsed object (or empty default) */
function readSettings() {
  const p = settingsPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

/** Write settings.json with pretty formatting */
function writeSettings(settings) {
  const p = settingsPath();
  fs.mkdirSync(require("path").dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

/** Create a backup of settings.json */
function backupSettings() {
  const src = settingsPath();
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, settingsBackupPath());
  return true;
}

/**
 * Build a hook entry object for settings.json.
 * @param {object} hookConfig - From manifest HOOK_CONFIGS
 * @returns {object} - The hook entry to insert into the hooks array
 */
function buildHookEntry(hookConfig) {
  const hookPath = forwardSlash(claudePath(hookConfig.dest));
  const entry = {
    type: "command",
    command: `node ${hookPath}`,
    timeout: hookConfig.timeout,
    _tag: TAG,
  };
  if (hookConfig.async) {
    entry.async = true;
  }
  return entry;
}

/**
 * Find the matcher group in an event's array that matches our criteria.
 * A matcher group is an object like { matcher?: "Write|Edit", hooks: [...] }
 */
function findMatcherGroup(eventArray, matcher) {
  return eventArray.find((group) => {
    if (matcher === null || matcher === undefined) {
      return !group.matcher;
    }
    return group.matcher === matcher;
  });
}

/**
 * Detect conflicts: existing untagged hooks that reference the same filename.
 * Returns array of warning strings.
 */
function detectConflicts(settings, hookConfigs) {
  const warnings = [];
  const hooks = settings.hooks || {};

  for (const config of hookConfigs) {
    const filename = require("path").basename(config.dest);
    const eventArray = hooks[config.event] || [];

    for (const group of eventArray) {
      for (const hook of group.hooks || []) {
        if (hook._tag === TAG) continue; // our own entry
        if (hook.command && hook.command.includes(filename)) {
          warnings.push(
            `Existing hook for "${config.event}" references "${filename}" — will not be modified`,
          );
        }
      }
    }
  }

  return warnings;
}

/**
 * Merge hook configs into settings.json.
 * - For each config, find or create the matcher group
 * - Remove any existing tagged entry (idempotency)
 * - Append the new tagged entry
 *
 * @param {object} settings - The settings object (mutated in place)
 * @param {object[]} hookConfigs - Array of hook configs from manifest
 * @returns {string[]} - Warning messages
 */
function mergeHooks(settings, hookConfigs) {
  if (!settings.hooks) settings.hooks = {};
  const warnings = detectConflicts(settings, hookConfigs);

  for (const config of hookConfigs) {
    if (!settings.hooks[config.event]) {
      settings.hooks[config.event] = [];
    }
    const eventArray = settings.hooks[config.event];

    // Find or create the matcher group
    let group = findMatcherGroup(eventArray, config.matcher);
    if (!group) {
      group = { hooks: [] };
      if (config.matcher) group.matcher = config.matcher;
      eventArray.push(group);
    }
    if (!group.hooks) group.hooks = [];

    // Remove existing tagged entries for this exact hook (idempotency)
    const hookEntry = buildHookEntry(config);
    group.hooks = group.hooks.filter(
      (h) => !(h._tag === TAG && h.command === hookEntry.command),
    );

    // Append
    group.hooks.push(hookEntry);
  }

  return warnings;
}

/**
 * Remove all tagged hook entries from settings.json.
 * Cleans up empty arrays and objects.
 *
 * @param {object} settings - The settings object (mutated in place)
 * @returns {number} - Number of entries removed
 */
function removeHooks(settings) {
  if (!settings.hooks) return 0;
  let removed = 0;

  for (const event of Object.keys(settings.hooks)) {
    const eventArray = settings.hooks[event];
    if (!Array.isArray(eventArray)) continue;

    for (const group of eventArray) {
      if (!Array.isArray(group.hooks)) continue;
      const before = group.hooks.length;
      group.hooks = group.hooks.filter((h) => h._tag !== TAG);
      removed += before - group.hooks.length;
    }

    // Remove empty matcher groups
    settings.hooks[event] = eventArray.filter(
      (group) => Array.isArray(group.hooks) && group.hooks.length > 0,
    );

    // Remove empty event arrays
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  // Remove empty hooks object
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  return removed;
}

/**
 * Check which of our hooks are currently installed.
 * @param {object} settings
 * @param {object[]} hookConfigs
 * @returns {Map<string, boolean>} - dest → installed
 */
function checkInstalledHooks(settings, hookConfigs) {
  const result = new Map();
  const hooks = settings.hooks || {};

  for (const config of hookConfigs) {
    const hookEntry = buildHookEntry(config);
    const eventArray = hooks[config.event] || [];
    let found = false;

    for (const group of eventArray) {
      for (const hook of group.hooks || []) {
        if (hook._tag === TAG && hook.command === hookEntry.command) {
          found = true;
          break;
        }
      }
      if (found) break;
    }

    result.set(config.dest, found);
  }

  return result;
}

/**
 * Remove untagged hooks that reference the same filename as our hooks.
 * This prevents duplicates when the same hooks exist from another source
 * (e.g., Recall hooks at a different path).
 *
 * @param {object} settings - The settings object (mutated in place)
 * @param {object[]} hookConfigs - Array of hook configs from manifest
 * @returns {string[]} - Descriptions of removed hooks
 */
function deduplicateHooks(settings, hookConfigs) {
  if (!settings.hooks) return [];
  const removed = [];

  for (const config of hookConfigs) {
    const filename = require("path").basename(config.dest);
    const eventArray = settings.hooks[config.event] || [];

    for (const group of eventArray) {
      if (!Array.isArray(group.hooks)) continue;
      group.hooks = group.hooks.filter((h) => {
        if (h._tag === TAG) return true;
        if (h.command && h.command.includes(filename)) {
          removed.push(`${config.event}: removed duplicate "${h.command}"`);
          return false;
        }
        return true;
      });
    }

    // Clean up empty groups
    settings.hooks[config.event] = eventArray.filter(
      (group) => Array.isArray(group.hooks) && group.hooks.length > 0,
    );
    if (settings.hooks[config.event].length === 0) {
      delete settings.hooks[config.event];
    }
  }

  return removed;
}

module.exports = {
  readSettings,
  writeSettings,
  backupSettings,
  buildHookEntry,
  mergeHooks,
  removeHooks,
  checkInstalledHooks,
  detectConflicts,
  deduplicateHooks,
};
