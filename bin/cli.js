#!/usr/bin/env node

/**
 * claude-autopilot CLI — entry point.
 *
 * Usage:
 *   npx claude-autopilot init [--yes] [--core]
 *   npx claude-autopilot uninstall
 *   npx claude-autopilot status
 *   npx claude-autopilot update
 */

const args = process.argv.slice(2);
const command = args[0];

const HELP = `
claude-autopilot — TDD-driven autonomous build system for Claude Code

Commands:
  init [--yes] [--core]  Install commands, rules, and hooks
  uninstall              Remove all installed components
  status                 Check installation status
  update                 Re-install (same as init --yes)
  help                   Show this help message

Flags:
  --yes    Install everything without prompts
  --core   Install core hooks only (skip optional)
`;

async function main() {
  switch (command) {
    case "init": {
      const { install } = require("../lib/install");
      await install({
        yes: args.includes("--yes"),
        core: args.includes("--core"),
      });
      break;
    }

    case "uninstall": {
      const { uninstall } = require("../lib/uninstall");
      await uninstall();
      break;
    }

    case "status": {
      const { status } = require("../lib/status");
      status();
      break;
    }

    case "update": {
      const { install } = require("../lib/install");
      await install({ yes: true });
      break;
    }

    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
