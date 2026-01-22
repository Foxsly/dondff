# ChatGPT HITL Orchestrator Prompts

## Phase 1 — Research

Use this prompt to start the research phase and gather initial information and insights.

```plaintext
Start Plan — Research
Task title: <title>
Task details:
<multiline context here>

Use the “Write Software Implementation Plan” guideline. Output only:
- Overview
- Background
- Notes

Stop for review after drafting.
```

## Phase 2 — Design

Use this prompt to proceed to the design phase after completing research.

```plaintext
Proceed to design phase.
Draft only the Design section (approach, file org, components, dependencies, integration points).
Stop for review after drafting.
```

## Phase 3 — Task Planning

Use this prompt to move from design to detailed task planning.

```plaintext
Proceed to task planning.
Create the Tasks section using the guideline’s checkbox template. Include:
- Full file paths
- Specific changes
- Purpose for each change
Stop for review after drafting.
```

## Implementation

Use this prompt to begin implementing the first task in the plan.

```plaintext
Implement Task — Step 1 only.
From the approved plan, produce a git-style unified diff for the first unchecked task only.
After the diff, stop for review.
```

Use this prompt to mark the current task complete and proceed to the next task only.

```plaintext
Mark task complete. Proceed to next task only.
```

Use this prompt to continue working through all remaining tasks without interruption.

```plaintext
Continue with all remaining tasks.
```

## Continuation and Drift

Use this prompt if you detect drift from the original plan and need to propose updates with reasoning, stopping for review.

```plaintext
Drift detected: propose plan updates with reasoning. Stop for review.
```

## Review

Use this prompt to review the implementation and provide feedback or necessary revisions.

```plaintext
Review implementation against the plan and guidelines.
- Summarize diffs vs. plan
- Confirm scope adherence
- List any required fixes
- If OK, say “approved” and provide final merge/PR notes
Stop for review.
```

# Provide Context

## Targeted context

Use this script to generate a zip file with targeted context needed to make the requested changes

```bash
mkdir -p _ctx/src/utils _ctx/config
# adjust paths as needed:
rsync -a src/utils/ _ctx/src/utils/
cp package.json _ctx/
cp tsconfig.json _ctx/ 2>/dev/null || true
zip -r context-targeted.zip _ctx
```

## Full Context

Use this script to generate a zip file with full context needed to make the requested changes
```bash
mkdir -p _ctx/src _ctx/config
# adjust paths as needed:
rsync -a src/ _ctx/src/
cp package.json _ctx/
cp tsconfig.json _ctx/ 2>/dev/null || true
zip -r context-targeted.zip _ctx
```