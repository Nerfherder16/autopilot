# Verification Checklist

## The Rule

**Never mark a task as DONE without completing this checklist.** In `/build` mode, this is enforced. In normal mode, treat it as strong guidance.

## Pre-Completion Checklist

### 1. Tests Pass
```bash
# Python
pytest --tb=short -q

# TypeScript
npm test -- --watchAll=false
```
- [ ] All existing tests still pass (no regressions)
- [ ] New tests for the changed code pass
- [ ] Test coverage for the feature is meaningful (not just smoke)

### 2. Types Clean
```bash
# Python (if using mypy)
mypy src/ --ignore-missing-imports

# TypeScript
npx tsc --noEmit
```
- [ ] No type errors introduced
- [ ] No `any` types added without justification
- [ ] New interfaces/types defined for new data shapes

### 3. Lint Clean
```bash
# Python
ruff check src/
ruff format --check src/

# TypeScript
npx eslint src/
npx prettier --check src/
```
- [ ] No lint warnings or errors
- [ ] Code formatted consistently

### 4. Smoke Test
- [ ] The feature actually works when you run it
- [ ] Verified manually (or via integration test) that the happy path works
- [ ] Checked at least one error/edge case

### 5. Security Check
- [ ] No hardcoded secrets
- [ ] Input validation on new endpoints/forms
- [ ] No `dangerouslySetInnerHTML` or raw SQL concatenation
- [ ] Error messages don't expose internals

## Build Mode Enforcement

In `/build` mode, `progress.json` task status transitions:

```
PENDING → IN_PROGRESS → (tests written) → (impl written) → (all checks pass) → DONE
```

A task can only move to DONE when:
1. `test_file` exists and is non-empty
2. `impl_file` exists and is non-empty
3. Running the test file produces 0 failures
4. `tsc --noEmit` passes (for TS files)
5. Lint passes on both files

## Verify Mode Report Format

The `/verify` command produces a report structured as:

```markdown
# Verification Report

## Summary
- Status: PASS / FAIL / PARTIAL
- Tasks: X/Y complete
- Tests: A passing, B failing
- Types: Clean / X errors
- Lint: Clean / X warnings

## Per-Task Results
| # | Task | Tests | Types | Lint | Status |
|---|------|-------|-------|------|--------|
| 1 | ... | PASS | CLEAN | CLEAN | PASS |

## Issues Found
1. [CRITICAL] Description...
2. [WARNING] Description...

## Spec Compliance
- [ ] Feature X matches spec
- [ ] Feature Y matches spec
```
