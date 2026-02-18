Interactive planning mode for the Autopilot system. You are creating a specification that `/build` will execute autonomously.

## Your Mission

Turn a vague idea into a precise, buildable spec. Be thorough — `/build` will follow this spec literally.

## Steps

### 1. Understand the Request
- Ask clarifying questions about the user's goal
- Identify the project type (Python/FastAPI, React/TS, or both)
- Determine scope boundaries (what's in, what's explicitly out)

### 2. Explore the Codebase
- If working in an existing project, read key files to understand patterns
- Identify existing conventions (naming, structure, testing framework)
- Note dependencies already in use
- Find related code that the new feature will interact with

### 3. Design the Solution
- Break the work into discrete, testable tasks (aim for 5-15 tasks)
- Each task should be completable in one TDD cycle
- Order tasks by dependency (foundational first)
- Identify test strategy per task

### 4. Write the Spec

Create `.autopilot/` directory and write `.autopilot/spec.md`:

```markdown
# Spec: [Project/Feature Name]

## Goal
One paragraph describing what we're building and why.

## Architecture
How the pieces fit together. Diagrams if helpful.

## Tasks
1. **[Task name]** — Description. Test: what to assert. File: where it goes.
2. **[Task name]** — Description. Test: what to assert. File: where it goes.
...

## Tech Stack
- Language/framework versions
- Key dependencies to use
- Testing framework

## Constraints
- What NOT to do
- Performance requirements
- Security considerations

## Definition of Done
What "complete" looks like for this feature.
```

### 5. Set Mode
Write `plan` to `.autopilot/mode`.

### 6. Get Approval
Present the spec to the user. Iterate until they approve. Once approved, tell them to run `/build` to execute.

## Rules
- Always create `.autopilot/` in the project root (or current working directory)
- Tasks must be ordered by dependency
- Each task must have a clear test strategy
- Spec should be detailed enough that another Claude instance could execute it
- Add `.autopilot/` to `.gitignore` if not already there
- If Recall MCP is configured, store the approved spec with domain "autopilot" and tags ["autopilot:spec"]
