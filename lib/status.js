/**
 * Status check: report what's installed.
 */

const fs = require("fs");
const { claudePath } = require("./paths");
const { allFiles, allHookConfigs } = require("./manifest");
const { readSettings, checkInstalledHooks } = require("./settings");

/**
 * Check and report installation status.
 */
function status() {
  console.log("\nclaude-autopilot status\n");

  const settings = readSettings();
  const hookStatus = checkInstalledHooks(settings, allHookConfigs(true));

  let totalInstalled = 0;
  let totalMissing = 0;

  // Check files
  const categories = [
    {
      name: "Commands",
      files: allFiles(true).filter((f) => f.dest.startsWith("commands/")),
    },
    {
      name: "Rules",
      files: allFiles(true).filter((f) => f.dest.startsWith("rules/")),
    },
    {
      name: "Hooks",
      files: allFiles(true).filter((f) => f.dest.startsWith("hooks/")),
    },
  ];

  for (const cat of categories) {
    console.log(`${cat.name}:`);
    for (const entry of cat.files) {
      const dest = claudePath(entry.dest);
      const fileExists = fs.existsSync(dest);
      const hookRegistered = hookStatus.has(entry.dest)
        ? hookStatus.get(entry.dest)
        : null;

      let statusStr;
      if (fileExists && (hookRegistered === null || hookRegistered === true)) {
        statusStr = "  OK";
        totalInstalled++;
      } else if (fileExists && hookRegistered === false) {
        statusStr = "  FILE OK, hook not registered";
        totalInstalled++;
        totalMissing++;
      } else {
        statusStr = "  NOT INSTALLED";
        totalMissing++;
      }

      const basename = entry.dest.split("/").pop();
      console.log(`  ${statusStr}  ${basename}`);
    }
    console.log();
  }

  // Summary
  const total = totalInstalled + totalMissing;
  if (totalMissing === 0 && totalInstalled > 0) {
    console.log(`All ${totalInstalled} components installed.`);
  } else if (totalInstalled === 0) {
    console.log("Nothing installed. Run: npx claude-autopilot init");
  } else {
    console.log(
      `${totalInstalled}/${total} components installed. Run: npx claude-autopilot init`,
    );
  }
}

module.exports = { status };
