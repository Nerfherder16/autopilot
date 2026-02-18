#!/usr/bin/env node
/**
 * PostToolUse hook: Auto-lint after Write/Edit.
 *
 * Reads stdin for tool_input JSON, detects language by file extension,
 * runs the appropriate linter (ruff for Python, eslint/prettier for JS/TS).
 * Exit code 2 blocks Claude until errors are fixed.
 */

const { execSync } = require("child_process");
const { existsSync, readFileSync } = require("fs");
const path = require("path");

/**
 * Cross-platform ruff discovery.
 * Tries PATH first (works on all platforms if ruff is installed globally),
 * then checks platform-specific fallback locations.
 */
function findRuff() {
  // Try PATH first (works everywhere)
  try {
    execSync("ruff --version", { stdio: "pipe", timeout: 5000 });
    return "ruff";
  } catch {}

  // Platform-specific fallbacks
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const appData = process.env.APPDATA || "";
    const candidates = [];

    // Standard Python installs
    for (const ver of ["Python311", "Python312", "Python313", "Python314"]) {
      candidates.push(
        path.join(localAppData, "Programs", "Python", ver, "Scripts", "ruff.exe"),
      );
    }
    // pip install --user
    candidates.push(path.join(appData, "Python", "Scripts", "ruff.exe"));
    // pythoncore installs
    for (const ver of [
      "pythoncore-3.11-64",
      "pythoncore-3.12-64",
      "pythoncore-3.13-64",
      "pythoncore-3.14-64",
    ]) {
      candidates.push(
        path.join(localAppData, "Python", ver, "Scripts", "ruff.exe"),
      );
    }

    for (const p of candidates) {
      try {
        execSync(`"${p}" --version`, { stdio: "pipe", timeout: 5000 });
        return p;
      } catch {}
    }
  } else {
    // macOS/Linux fallbacks
    const home = process.env.HOME || "";
    const candidates = [
      path.join(home, ".local", "bin", "ruff"),
      path.join(home, ".cargo", "bin", "ruff"),
      "/usr/local/bin/ruff",
    ];

    for (const p of candidates) {
      try {
        execSync(`"${p}" --version`, { stdio: "pipe", timeout: 5000 });
        return p;
      } catch {}
    }
  }

  return null;
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 3000);
  });
}

function getAutopilotMode(filePath) {
  let dir = path.dirname(filePath);
  for (let i = 0; i < 10; i++) {
    const modeFile = path.join(dir, ".autopilot", "mode");
    if (existsSync(modeFile)) {
      try {
        return readFileSync(modeFile, "utf8").trim();
      } catch {
        return "";
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "";
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: ["pipe", "pipe", "pipe"], timeout: 20000 });
    return { ok: true, output: "" };
  } catch (e) {
    return {
      ok: false,
      output: (e.stderr?.toString() || "") + (e.stdout?.toString() || ""),
    };
  }
}

async function main() {
  const input = await readStdin();
  if (!input) process.exit(0);

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const toolInput = parsed.tool_input || {};
  const filePath = toolInput.file_path || toolInput.path || "";

  if (!filePath) process.exit(0);

  // Skip linting hook files themselves
  if (filePath.replace(/\\/g, "/").includes("/hooks/")) process.exit(0);

  if (filePath.endsWith(".py")) {
    const ruff = findRuff();
    if (!ruff) {
      process.exit(0);
    }

    run(`"${ruff}" check --fix "${filePath}"`);
    run(`"${ruff}" format "${filePath}"`);
    const check = run(`"${ruff}" check "${filePath}"`);
    if (!check.ok) {
      process.stderr.write(`Lint errors in ${filePath}:\n${check.output}\n`);
      process.exit(2);
    }
  } else if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
    run(`npx prettier --write "${filePath}"`);
    const eslint = run(`npx eslint --fix "${filePath}"`);
    if (!eslint.ok && !eslint.output.includes("eslint.config")) {
      const recheck = run(`npx eslint "${filePath}"`);
      if (!recheck.ok && !recheck.output.includes("eslint.config")) {
        process.stderr.write(
          `Lint errors in ${filePath}:\n${recheck.output}\n`,
        );
        process.exit(2);
      }
    }

    if (/\.(ts|tsx)$/.test(filePath)) {
      let tsconfigDir = path.dirname(filePath);
      let tsconfigFound = false;
      for (let i = 0; i < 10; i++) {
        if (existsSync(path.join(tsconfigDir, "tsconfig.json"))) {
          tsconfigFound = true;
          break;
        }
        const parent = path.dirname(tsconfigDir);
        if (parent === tsconfigDir) break;
        tsconfigDir = parent;
      }

      if (tsconfigFound) {
        const tsc = run(
          `npx tsc --noEmit --project "${path.join(tsconfigDir, "tsconfig.json")}"`,
        );
        if (!tsc.ok) {
          const mode = getAutopilotMode(filePath);
          if (mode === "build") {
            process.stderr.write(
              `Type errors (blocking in build mode):\n${tsc.output}\n`,
            );
            process.exit(2);
          } else {
            process.stderr.write(
              `Type check warnings:\n${tsc.output}\n`,
            );
          }
        }
      }
    }
  }

  process.exit(0);
}

main().catch((e) => {
  process.stderr.write(`lint-check error: ${e.message}\n`);
  process.exit(0);
});
