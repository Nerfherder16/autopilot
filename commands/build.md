Autonomous build mode for the Autopilot system. You execute the spec created by `/plan` using strict TDD.

## Pre-Flight Checks

1. Verify `.autopilot/spec.md` exists — refuse to start without it
2. Read the spec completely
3. Check if `.autopilot/progress.json` exists (resuming a previous build?)
4. If resuming: read `progress.json` and `build.log`, check for handoff notes, resume from first non-DONE task
5. If fresh: create `progress.json` from spec tasks

## Setup

1. Set `.autopilot/mode` to `build`
2. Create a git branch: `autopilot/<project-name>-YYYYMMDD`
3. Initialize `progress.json` with all tasks as PENDING
4. Initialize `build.log`

## The Build Loop

For each task in order:

### 1. Update State — MANDATORY, DO THIS FIRST
- **Write `progress.json` to disk NOW** with this task set to `IN_PROGRESS`
- This is not optional — if the build is interrupted, progress.json is the only record of where we stopped
- Log: `[timestamp] TASK_START: #N - description`

### 2. RED — Write Failing Test
- Create/update the test file
- Write tests that assert the expected behavior
- Run the test suite — confirm the new test FAILS
- Log: `[timestamp] TEST_RED: test_file - N failing`
- If test passes without implementation, the test is wrong — fix it

### 3. GREEN — Write Implementation
- Write minimal code to make the test pass
- Run the test suite — confirm ALL tests PASS
- Log: `[timestamp] TEST_GREEN: test_file - N passing`
- If tests fail, debug and fix (do not skip)

### 4. REFACTOR
- Clean up code while tests stay green
- Run full test suite after refactoring

### 5. Verify
- Run type checker (`tsc --noEmit` for TS, `mypy` for Python if configured)
- Run linter (`ruff` for Python, `eslint` for TS)
- If any failures, fix them before proceeding
- Coverage check (Python, if pytest-cov available):
  - Run `pytest --cov --cov-report=json --cov-fail-under=0 -q`
  - Parse `coverage.json` for the impl file's coverage percentage
  - Warn in build log if < 80% — do NOT block (soft gate)
  - Skip silently if pytest-cov is not installed
  - Clean up `coverage.json` after parsing

### 6. Complete Task — MANDATORY, WRITE PROGRESS IMMEDIATELY
- **Write `progress.json` to disk NOW** with this task set to `DONE` and test counts updated
- Do NOT batch progress updates — each task completion must be persisted before moving on
- Log: `[timestamp] TASK_DONE: #N - description`
- Commit: `git add -A && git commit -m "autopilot: task #N - description"`

### 7. Next Task
- Move to next PENDING task
- If all tasks DONE, go to Completion

## Completion

1. Run full test suite one final time
2. Run type checker and linter on entire project
3. Run coverage check if pytest-cov available — save results for PR body
4. Set `progress.json` status to `COMPLETE`
5. Log: `[timestamp] COMPLETE: All N tasks done`
6. Set `.autopilot/mode` to empty string
7. Push branch: `git push -u origin <branch>`
8. Create PR (non-fatal if `gh` unavailable):
   - Title: `autopilot: <project-name>`
   - Body: spec Goal section + task list + test counts + coverage summary
   - Use HEREDOC syntax for body
   - Log: `[timestamp] PR_CREATED: <PR URL>`
9. If Recall MCP is configured, store completion report (include PR URL if created):
   - domain: "autopilot"
   - tags: ["autopilot:complete", "project:<name>"]
   - importance: 0.8
10. Tell user: "Build complete. PR created: <URL>. Run `/verify` for independent review."

## Handoff (if context limit approaching)

If you sense you're running low on context:
1. Finish current task (or mark IN_PROGRESS)
2. Commit all work
3. Update `progress.json` — set status to `PAUSED`
4. Append handoff entry to `build.log`
5. If Recall MCP is configured, store handoff with domain "autopilot", tags ["autopilot:handoff"]
6. Tell user to run `/build` again to resume

## Test Quality Rules
- Write tests that exercise RUNTIME BEHAVIOR — call actual functions, hit actual endpoints
- Do NOT write tests that only check source code with regex/string matching
- Tests must import and execute the code under test, not just assert file contents
- If the project has test fixtures (conftest.py, test utilities), USE THEM
- Each test should fail if the implementation is broken, and pass if it works

## Rules
- NEVER skip the RED phase — always write tests first
- NEVER mark a task DONE without all tests passing
- NEVER modify the spec — if something seems wrong, log it and continue
- NEVER stop mid-task without saving state
- NEVER batch progress.json updates — write after EVERY task state change
- Commit after every completed task
- Minimize user interaction — only ask when truly blocked
- Follow all rules in `.claude/rules/` (TDD, quality, security, etc.)
