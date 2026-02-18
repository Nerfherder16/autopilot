# Context Continuation Protocol

## Purpose

Autopilot builds may span multiple Claude sessions. This protocol ensures seamless handoffs using `.autopilot/progress.json` (and optionally Recall storage, if configured).

## Endless Mode

When `/build` is running, Claude operates in "endless mode":
- Does NOT stop until all tasks are DONE or BLOCKED
- If hitting context limits, performs a graceful handoff (see below)
- Minimizes user interaction — only asks when truly stuck

## Handoff Protocol

### When to Handoff
- Context window approaching 80% capacity
- A task requires external action (deploy, manual test, etc.)
- Unrecoverable error that needs human input

### Handoff Steps

1. **Save progress** — Update `progress.json` with current state
2. **Log the handoff** — Append to `build.log`:
   ```
   [2026-02-16T10:15:00Z] HANDOFF: Completed tasks 1-5. Task 6 IN_PROGRESS.
   Reason: Context window at 80%.
   Next steps: Continue with task 6 (implement user profile endpoint).
   ```
3. **Store to Recall (if configured)** — If Recall MCP is available, save handoff summary:
   ```
   recall_store(
     content="Autopilot handoff for project-name: Tasks 1-5 DONE, task 6 in progress (user profile endpoint). Branch: autopilot/project-name-20260216. Resume with /build.",
     memory_type="episodic",
     domain="autopilot",
     tags=["autopilot:handoff", "project:project-name"],
     importance=0.9
   )
   ```
4. **Commit work** — All code changes committed to the autopilot branch
5. **Notify user** — Clear message about what's done and how to resume

### Resuming After Handoff

When `/build` starts and finds existing `.autopilot/`:
1. Read `progress.json` — identify PENDING and IN_PROGRESS tasks
2. Read `build.log` — understand what happened
3. If Recall MCP is configured, query for handoff notes: `recall_search(query="autopilot handoff project-name")`
4. Resume from the first non-DONE task
5. Re-run tests for the last completed task (verify no drift)

## Multi-Session Build State

### `progress.json` Status Values

| Status | Meaning |
|--------|---------|
| `BUILDING` | Active build in progress |
| `PAUSED` | Handoff occurred, awaiting resume |
| `COMPLETE` | All tasks DONE, verified |
| `FAILED` | Unrecoverable error, needs human |

### Task Status Values

| Status | Meaning |
|--------|---------|
| `PENDING` | Not started |
| `IN_PROGRESS` | Currently being worked on |
| `DONE` | Completed and verified |
| `BLOCKED` | Cannot proceed (dependency or error) |

## Build Log Format

Append-only, one entry per significant action:

```
[ISO-8601] ACTION: Description
[ISO-8601] TEST_RED: tests/test_feature.py - 1 failing
[ISO-8601] TEST_GREEN: tests/test_feature.py - 3 passing
[ISO-8601] TASK_DONE: #1 - Created user model
[ISO-8601] HANDOFF: Reason and next steps
[ISO-8601] RESUME: Continuing from task #6
[ISO-8601] COMPLETE: All 8 tasks done, verified
```

## Recall Integration (Optional)

If the Recall MCP server is configured, the following data is stored automatically:

### What Gets Stored
- Handoff summaries (episodic, importance 0.9)
- Completed specs (semantic, importance 0.8)
- Build completion reports (episodic, importance 0.7)

### Tags
- `autopilot:handoff` — handoff events
- `autopilot:spec` — approved specifications
- `autopilot:complete` — build completion reports
- `project:<name>` — project identifier

### Retrieval
Any Claude instance can find autopilot state:
```
recall_search(query="autopilot status project-name", domain="autopilot")
```

## Safety Rails

- Never delete `progress.json` — only append/update
- Never overwrite `build.log` — only append
- Always commit before handoff
- Always re-verify after resume
- If `progress.json` is corrupt, refuse to continue and alert user
