# TDD Enforcement Rules

## The Iron Rule

**Every implementation file MUST have a corresponding test file.** No exceptions in `/build` mode. Warnings in normal mode.

## RED-GREEN-REFACTOR Cycle

When implementing any feature in `/build` mode:

### 1. RED — Write the failing test first
- Create or update the test file before touching implementation
- Test must assert the expected behavior
- Run the test — confirm it **fails** (RED)
- If it passes without implementation, the test is wrong

### 2. GREEN — Write minimal implementation
- Write just enough code to make the test pass
- No extra features, no premature optimization
- Run the test — confirm it **passes** (GREEN)

### 3. REFACTOR — Clean up while green
- Improve code quality, naming, structure
- Run tests again — confirm still **GREEN**
- Only then move to the next task

## File Pairing Rules

Test files don't need to mirror the source tree exactly. Use the project's actual test layout:

| Pattern | Example |
|---------|---------|
| Python: group by layer | `tests/core/`, `tests/api/`, `tests/workers/`, `tests/integration/` |
| Python: `test_` prefix | `tests/core/test_domains.py` for `src/core/domains.py` |
| TS/React: co-located `__tests__/` | `src/components/__tests__/Button.test.tsx` |
| TS: alternative `tests/` root | `tests/api/users.test.ts` for `src/api/users.ts` |

### Discovery Rule
When checking for test coverage, **search the entire `tests/` directory** (and co-located `__tests__/` dirs) for files that import or test the implementation module. Don't assume mirror paths — use the project's actual layout.

## Exemptions

These files do NOT require tests:
- Configuration files (`pyproject.toml`, `tsconfig.json`, `tailwind.config.*`)
- Type definition files (`.d.ts`, pure type exports)
- Static assets and styles
- Migration files
- `__init__.py` files that only re-export
- `.env` and environment files
- Markdown documentation

## Verification Checklist (per task)

Before marking any task DONE in `progress.json`:
- [ ] Test file exists and is paired correctly
- [ ] Test was written before implementation (RED phase logged)
- [ ] All tests for this task pass
- [ ] No other tests were broken
- [ ] Test covers the happy path AND at least one edge case

## Coverage Expectations

- **Target:** 80% line coverage per implementation file
- **During `/build`:** Soft gate — warns in the build log if < 80%, never blocks. The RED-GREEN-REFACTOR cycle should not be slowed by coverage tooling; coverage is checked after GREEN.
- **During `/verify`:** Reported in the verification table. < 80% = Warning, < 50% = Critical.
- **Tooling:** `pytest-cov` (Python). Skipped silently if not installed. TS/JS coverage is not enforced (add when the project uses vitest/jest coverage).
- **Why soft:** Some patterns (error handlers, edge-case branches) are hard to cover at 80% without brittle tests. The threshold is guidance, not a gate, during active development.

## Enforcement

TDD discipline is enforced by the `/build` workflow itself — it refuses to mark tasks DONE without passing tests. There is no hook-level enforcement; PostToolUse hooks fire after writes are applied and cannot actually block them.

The `/build` command enforces:
- Test file must be written BEFORE implementation (RED phase)
- All tests must pass before marking a task DONE
- `progress.json` is updated per-task as proof of compliance
