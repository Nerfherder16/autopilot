/**
 * Install orchestration: copy files + merge settings.
 */

const fs = require("fs");
const path = require("path");
const { claudePath } = require("./paths");
const {
  FILES,
  HOOK_CONFIGS,
  srcPath,
  allFiles,
  allHookConfigs,
} = require("./manifest");
const {
  readSettings,
  writeSettings,
  backupSettings,
  mergeHooks,
  deduplicateHooks,
} = require("./settings");
const { confirm, multiSelect } = require("./prompt");

/**
 * Copy a file from package to ~/.claude/, creating directories as needed.
 * @param {object} entry - { src, dest }
 * @returns {boolean} - true if copied
 */
function copyFile(entry) {
  const src = srcPath(entry);
  const dest = claudePath(entry.dest);

  if (!fs.existsSync(src)) {
    process.stderr.write(`  SKIP: ${entry.src} (source not found)\n`);
    return false;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

/**
 * Run the install flow.
 * @param {object} options
 * @param {boolean} options.yes - Skip prompts, install everything
 * @param {boolean} options.core - Skip optional hooks
 */
async function install(options = {}) {
  const { yes = false, core = false } = options;

  console.log("\nclaude-autopilot installer\n");

  // Determine which optional hooks to install
  let includeOptional = [];
  if (core) {
    includeOptional = [];
    console.log("Installing core only (--core flag).\n");
  } else if (yes) {
    includeOptional = FILES.hooks.optional.map((f) => f.dest);
    console.log("Installing all components (--yes flag).\n");
  } else {
    const choices = FILES.hooks.optional.map((f) => ({
      name: path.basename(f.dest, ".js"),
      checked: true,
    }));
    const selected = await multiSelect("Select optional hooks:", choices);
    includeOptional = FILES.hooks.optional
      .filter((f) => selected.includes(path.basename(f.dest, ".js")))
      .map((f) => f.dest);
  }

  // Copy files
  console.log("Copying files...");
  let copied = 0;
  let skipped = 0;

  // Commands
  for (const entry of FILES.commands) {
    if (copyFile(entry)) {
      console.log(`  + ${entry.dest}`);
      copied++;
    } else {
      skipped++;
    }
  }

  // Rules
  for (const entry of FILES.rules) {
    if (copyFile(entry)) {
      console.log(`  + ${entry.dest}`);
      copied++;
    } else {
      skipped++;
    }
  }

  // Core hooks
  for (const entry of FILES.hooks.core) {
    if (copyFile(entry)) {
      console.log(`  + ${entry.dest}`);
      copied++;
    } else {
      skipped++;
    }
  }

  // Optional hooks
  for (const entry of FILES.hooks.optional) {
    if (includeOptional.includes(entry.dest)) {
      if (copyFile(entry)) {
        console.log(`  + ${entry.dest} (optional)`);
        copied++;
      } else {
        skipped++;
      }
    }
  }

  // Merge settings.json
  console.log("\nConfiguring settings.json...");
  const backedUp = backupSettings();
  if (backedUp) {
    console.log("  Backup: settings.json.bak");
  }

  const settings = readSettings();

  // Build hook config list based on what was selected
  const hookConfigs = [...HOOK_CONFIGS.core];
  for (const config of HOOK_CONFIGS.optional) {
    if (includeOptional.includes(config.dest)) {
      hookConfigs.push(config);
    }
  }

  // Remove duplicate hooks from other sources (e.g., Recall) before merging
  const dupes = deduplicateHooks(settings, hookConfigs);
  for (const d of dupes) {
    console.log(`  DEDUP: ${d}`);
  }

  const warnings = mergeHooks(settings, hookConfigs);
  writeSettings(settings);

  for (const w of warnings) {
    console.log(`  WARNING: ${w}`);
  }
  console.log(`  Registered ${hookConfigs.length} hooks in settings.json`);

  // Summary
  console.log(
    `\nDone! ${copied} files installed${skipped ? `, ${skipped} skipped` : ""}.`,
  );
  console.log("\nAvailable commands:");
  console.log("  /plan   — Interactive spec creation");
  console.log("  /build  — Autonomous TDD build");
  console.log("  /verify — Independent review");
  console.log("  /fix    — Targeted TDD fixes");
  console.log("\nRun `npx claude-autopilot status` to verify installation.");
}

module.exports = { install };
