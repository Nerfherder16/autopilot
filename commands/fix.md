Targeted fix mode for the Autopilot system. You take `/verify` findings and fix them using TDD, then re-verify.

## Pre-Flight

1. Verify `.autopilot/progress.json` exists — refuse to start without it
2. Find the verification report:
   - If Recall MCP is configured: query `recall_search(query="autopilot verify", tags=["autopilot:verify"])`
   - If not found or Recall unavailable, ask the user to paste the report or run `/verify` first
3. Read `.autopilot/spec.md` for context
4. Read `.autopilot/build.log` for history

## Setup

1. Set `.autopilot/mode` to `fix`
2. Parse the "Issues Found" section of the verification report:
   - **Critical** issues become fix tasks
   - **Warning** issues become fix tasks
   - **Suggestions** are logged but not actioned (note in build.log)
3. Append fix tasks to existing `progress.json` — IDs continue from the last task
4. Log: `[timestamp] FIX_START: N issues to fix from verification report`

## Fix Loop

For each issue, in order (Critical first, then Warnings):

### 1. Understand
- Read the file(s) cited in the issue
- Understand the root cause

### 2. RED — Write Reproducing Test
- Write a test that exposes the issue (fails now, should pass after fix)
- Run test — confirm it FAILS
- Log: `[timestamp] FIX_RED: #N - test_file - description`
- **Skip RED for:** refactoring issues, style issues, or issues where existing tests already cover the behavior

### 3. GREEN — Minimal Fix
- Write the smallest change that resolves the issue
- Run test — confirm it PASSES
- Run full test suite — confirm no regressions
- Log: `[timestamp] FIX_GREEN: #N - all tests passing`

### 4. Complete Fix
- Update `progress.json` — mark fix task DONE
- Log: `[timestamp] FIX_DONE: #N - description`
- Commit: `git add -A && git commit -m "fix: #N - description"`

## After All Fixes

1. Run full test suite
2. Run type checker and linter
3. Run coverage check if available
4. Auto-verify: perform the same checks as `/verify` and produce a mini-report
5. If new issues found:
   - Increment fix cycle counter
   - If cycle < 3: loop back to Setup with new issues
   - If cycle >= 3: escalate to user — "3 fix cycles completed, issues remain. Manual review needed."
6. Push: `git push`
7. Update PR if it exists: `gh pr edit <number> --body "updated body with fix summary"`
   - Non-fatal if `gh` unavailable
8. If Recall MCP is configured, store fix report:
   - domain: "autopilot"
   - tags: ["autopilot:fix", "project:<name>"]
   - importance: 0.7
9. Set `.autopilot/mode` to empty string
10. Tell user: "Fixes complete. N issues resolved. Re-verification: PASS/FAIL."

## Safety Rails

- **Max 3 fix-verify cycles** before escalating to user
- **Never modify the spec** — if the spec is wrong, that's a `/plan` revision
- **Never delete existing tests** — only add or strengthen them
- Commit after every fix (not batched)
- Always update `progress.json` per-fix

## Rules

- Follow TDD discipline (RED-GREEN for behavioral fixes, direct fix for style/refactor)
- Minimize blast radius — fix only what the report cites
- Do not refactor beyond what's needed to resolve the issue
- Log every action to `build.log`
