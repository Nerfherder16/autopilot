/**
 * Uninstall orchestration: remove files + clean settings.
 */

const fs = require("fs");
const { claudePath } = require("./paths");
const { allFiles, allHookConfigs } = require("./manifest");
const {
  readSettings,
  writeSettings,
  backupSettings,
  removeHooks,
} = require("./settings");

/**
 * Run the uninstall flow.
 * Removes all installed files and cleans hook entries from settings.json.
 */
async function uninstall() {
  console.log("\nclaude-autopilot uninstaller\n");

  // Remove files
  console.log("Removing files...");
  let removed = 0;
  let missing = 0;

  for (const entry of allFiles(true)) {
    const dest = claudePath(entry.dest);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      console.log(`  - ${entry.dest}`);
      removed++;
    } else {
      missing++;
    }
  }

  // Clean up empty autopilot hooks directory
  const hooksDir = claudePath("hooks", "autopilot");
  try {
    const remaining = fs.readdirSync(hooksDir);
    if (remaining.length === 0) {
      fs.rmdirSync(hooksDir);
      console.log("  - hooks/autopilot/ (empty directory)");
    }
  } catch {
    // directory doesn't exist — fine
  }

  // Clean settings.json
  console.log("\nCleaning settings.json...");
  const backedUp = backupSettings();
  if (backedUp) {
    console.log("  Backup: settings.json.bak");
  }

  const settings = readSettings();
  const hookCount = removeHooks(settings);
  writeSettings(settings);
  console.log(`  Removed ${hookCount} hook entries`);

  // Summary
  console.log(
    `\nDone! ${removed} files removed${missing ? `, ${missing} already absent` : ""}.`,
  );
}

module.exports = { uninstall };
