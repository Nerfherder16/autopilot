# claude-autopilot

TDD-driven autonomous build system for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Adds `/plan`, `/build`, `/verify`, and `/fix` slash commands that turn Claude into a methodical, test-first developer.

## What It Does

| Command | Mode | Description |
|---------|------|-------------|
| `/plan` | Interactive | Turn a vague idea into a precise, buildable spec |
| `/build` | Autonomous | Execute the spec using strict RED-GREEN-REFACTOR TDD |
| `/verify` | Read-only | Independent review of build output against spec |
| `/fix` | Targeted | TDD fixes for `/verify` findings, auto-re-verifies |

## Install

```bash
npx claude-autopilot init
```

This installs:
- **4 slash commands** to `~/.claude/commands/`
- **4 rule files** to `~/.claude/rules/`
- **3 core hooks** + **3 optional hooks** to `~/.claude/hooks/autopilot/`
- Hook registrations in `~/.claude/settings.json`

### Options

```bash
npx claude-autopilot init          # Interactive (choose optional hooks)
npx claude-autopilot init --yes    # Install everything, no prompts
npx claude-autopilot init --core   # Core hooks only, skip optional
```

## Hooks

### Core (always installed)

| Hook | Event | Purpose |
|------|-------|---------|
| `autopilot-approver.js` | PreToolUse | Auto-approve Write/Edit/Bash in build/fix mode |
| `tdd-enforcer.js` | PostToolUse | Warn (or block in /build) when editing without tests |
| `build-guard.js` | Stop | Prevent stopping mid-build with pending tasks |

### Optional

| Hook | Event | Purpose |
|------|-------|---------|
| `lint-check.js` | PostToolUse | Auto-lint on file write (ruff for Python, eslint/prettier for JS/TS) |
| `stop-guard.js` | Stop | Block stopping with uncommitted git changes |
| `context-monitor.js` | PostToolUse | Warn when context window is getting large |

## Usage

```bash
# 1. Plan your feature
/plan

# 2. Build it (autonomous TDD)
/build

# 3. Verify the output
/verify

# 4. Fix any issues
/fix
```

### The Build Loop

Each task follows strict TDD:

1. **RED** — Write a failing test first
2. **GREEN** — Write minimal implementation to pass
3. **REFACTOR** — Clean up while green
4. Commit, move to next task

Progress is tracked in `.autopilot/progress.json` so builds can be resumed across sessions.

## Recall Integration (Optional)

If you have [System-Recall](https://github.com/Nerfherder16/System-Recall) configured as an MCP server, autopilot will automatically store specs, handoff states, and completion reports for cross-session continuity. Without Recall, everything still works — progress is tracked via `.autopilot/` files.

## Management

```bash
npx claude-autopilot status      # Check what's installed
npx claude-autopilot update      # Re-install latest (overwrites)
npx claude-autopilot uninstall   # Clean removal
```

## How It Works

- **Commands** are Claude Code slash commands (markdown prompts in `~/.claude/commands/`)
- **Rules** are always-loaded context files (markdown in `~/.claude/rules/`)
- **Hooks** are Node.js scripts triggered by Claude Code events (via `~/.claude/settings.json`)

All hook entries in `settings.json` are tagged with `_tag: "__claude-autopilot__"` for safe install/uninstall without affecting your other hooks.

## Requirements

- Node.js >= 18
- Claude Code CLI
- Git (for `/build` branching and commits)
- Optional: `ruff` (Python linting), `eslint`/`prettier` (JS/TS linting)

## License

MIT
