# Autopilot Spec Workflow

## State Machine

The Autopilot system has three modes controlled by `.autopilot/mode`:

```
(inactive) → /plan → PLANNING → approve → /build → BUILDING → /verify → VERIFYING → (done)
                ↑                              ↑                    |
                └──── revise ──────────────────┘                    |
                                               ←── issues found ───┘
                                                                    |
                                                              /fix → FIXING → auto-verify ──→ (done)
                                                                ↑               |
                                                                └── issues ─────┘ (max 3 cycles)
```

### Mode Values
- Empty or missing: **Inactive** — no autopilot session
- `plan`: **Planning** — interactive spec creation
- `build`: **Building** — autonomous TDD execution
- `verify`: **Verifying** — independent review pass
- `fix`: **Fixing** — targeted TDD fixes from verification findings

## `.autopilot/` Directory Schema

Every autopilot session creates this directory in the project root:

```
.autopilot/
  mode            # Plain text: "plan" | "build" | "verify" | "fix" | ""
  spec.md         # The approved specification (created by /plan)
  progress.json   # Task statuses, phase, test counts (created by /build)
  build.log       # Append-only log of build actions (created by /build)
```

### `progress.json` Schema

```json
{
  "project": "project-name",
  "status": "BUILDING|COMPLETE|FAILED|PAUSED",
  "branch": "autopilot/project-name-YYYYMMDD",
  "tasks": [
    {
      "id": 1,
      "description": "Task description",
      "status": "DONE|PENDING|IN_PROGRESS|BLOCKED",
      "test_file": "tests/test_feature.py",
      "impl_file": "src/feature.py"
    }
  ],
  "tests": { "total": 0, "passing": 0, "failing": 0 },
  "updated_at": "ISO-8601 timestamp"
}
```

## Rules for Mode Transitions

1. **Only `/plan` can create `.autopilot/`** — never create it manually
2. **Only `/plan` writes `spec.md`** — after user approval
3. **`/build` requires `spec.md` to exist** — refuses to start without it
4. **`/build` sets mode to "build"** and creates `progress.json`
5. **`/verify` can run at any time** — reads spec + progress, produces report
6. **`/fix` requires a verification report** — queries Recall (if configured) or asks user for findings
7. **`/fix` sets mode to "fix"** and appends fix tasks to `progress.json`
8. **Mode must be cleared** when work is complete or abandoned

## Interaction Between Modes

- `/plan` is **interactive**: asks questions, explores codebase, iterates on spec
- `/build` is **autonomous**: reads spec, creates tasks, executes TDD loop, minimal user interaction
- `/verify` is **read-only**: never modifies source code, only reads and reports
- `/fix` is **targeted**: takes verify findings, applies TDD fixes, auto-re-verifies (max 3 cycles)

## Adding to `.gitignore`

The `.autopilot/` directory should be gitignored — it's local workflow state, not source code:
```
# Autopilot workflow state
.autopilot/
```
