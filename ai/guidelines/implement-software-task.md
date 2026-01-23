---
title: 'Implement Software Task'
type: 'guideline'
description: |
  Guidelines for setting up work environment and executing software implementations
created_at: '2025-06-09T03:30:00.000Z'
entity_id: 'a1b2c3d4-5e6f-7890-abcd-ef1234567890'
globs:
  - 'task/**/*.md'
observations:
  - '[workflow] Isolated worktrees prevent conflicts with main development branch'
  - '[quality] Step-by-step execution with review stops ensures quality'
  - '[safety] Working directory verification prevents errors'
relations:
  - 'related_to [[sys:system/guideline/write-workflow.md]]'
  - 'implements [[sys:system/text/system-design.md]]'
  - 'follows [[sys:system/workflow/write-software-implementation-plan.md]]'
tags:
updated_at: '2025-07-26T00:00:00.000Z'
user_public_key: '0000000000000000000000000000000000000000000000000000000000000000'
---

# Implement Software Task

## Guidelines

### Prerequisites

- An implementation plan MUST exist before starting work
- The implementation plan MUST be located in the task file or as a separate text entity
- The plan MUST include specific file changes and tasks

### Worktree and Environment Setup

**CRITICAL: Never commit directly to `main` or `master` branches**

- A dedicated worktree MUST be created for each software task to isolate changes
- ALL development work MUST be done in feature branches within worktrees
- Branch naming MUST follow the pattern: `fix/{issue-number}-{short-description}` or `feat/{issue-number}-{short-description}`
- Worktree creation MUST follow this pattern:
  1. Navigate to the target project repository directory (NOT user-base)
  2. Verify clean state: `git status` and `git branch --show-current`
  3. Create worktree: `git worktree add -b {branch-name} ../{repo-name}-worktrees/{branch-name}`
  4. Navigate to worktree: `cd ../{repo-name}-worktrees/{branch-name}`
  5. Install dependencies: `yarn install`
  6. Document the worktree path for all subsequent operations

### Execution Process

- Tasks from the implementation plan MUST be executed one at a time
- Each task MUST be completed fully before proceeding to the next
- Work MUST stop after each task for review unless explicitly instructed otherwise
- The working directory MUST be verified before each operation
- The implementation plan MUST be updated with progress after each task completion

### Step-by-Step Review Protocol

- After completing each task, MUST stop and present what was completed
- MUST wait for explicit confirmation before proceeding to next task
- MAY proceed with all remaining tasks only when explicitly instructed
- MUST NOT make assumptions about continuing without user approval

### Implementation Plan Management

- Tasks MUST be marked as completed in the implementation plan using checkbox format: `- [x]`
- If implementation reveals better approaches or additional tasks needed (drift detection):
  - Implementation MUST stop immediately
  - Proposed changes MUST be presented for review with reasoning
  - Plan updates MUST be approved before continuing
  - Only after approval should the plan be updated and work resumed

### Testing and Quality Assurance

- Tests SHOULD be run periodically during implementation to verify correctness
- Code quality checks MUST be run before staging: `yarn lint` and `yarn typecheck`
- Full test suite MUST be run before considering implementation complete
- Appropriate test commands: `yarn test:unit`, `yarn test:integration`, `yarn test:file {specific-test}`

### Change Management

- All changes MUST be staged with `git add .` when implementation is complete
- Changes MUST NOT be committed until after review process
- The working directory path MUST be documented in all communications
- Git status MUST be checked before and after making changes

### Safety and Verification

- Current working directory MUST be verified before executing any commands
- Operations MUST be performed in the correct worktree, not the main repository
- File paths MUST be verified before making edits
- Changes MUST be reviewed with `git diff` before staging

## Common Pitfalls to Avoid

- DO NOT commit directly to main or master branches
- DO NOT proceed to multiple tasks without explicit instruction
- DO NOT work outside the implementation plan scope
- DO NOT forget to update the implementation plan with progress
- DO NOT make changes without verifying working directory
- DO NOT stage changes until all tasks are complete and tested
- DO NOT update the plan without review when drift is discovered - stop and get approval first
