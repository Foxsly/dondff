---
title: 'Implement Software Task Workflow'
type: 'workflow'
description: |
  Execute software implementation by setting up work environment and following implementation plans
created_at: '2025-06-09T03:30:00.000Z'
entity_id: 'b2c3d4e5-6f78-9012-cdef-123456789abc'
guidelines:
  - 'sys:system/guideline/implement-software-task.md'
  - 'sys:system/guideline/write-software-tests.md'
  - 'sys:system/guideline/write-javascript.md'
  - 'user:guideline/write-software.md'
prompt_properties:
  - name: workflow_example
    type: object
    required: false
    description: Example workflow data to populate templates and examples
    default:
      org: 'mistakia'
      repo: 'base'
      issue_number: '16'
      task_name: 'modify-thread-creation'
      short_description: 'no-auto-change-requests'
      branch_name: 'fix/16-no-auto-change-requests'
      worktree_path: '../base-worktrees/fix-16-no-auto-change-requests'
relations:
  - 'implements [[sys:system/guideline/implement-software-task.md]]'
  - 'uses [[sys:system/guideline/write-workflow.md]]'
  - 'follows [[sys:system/workflow/write-software-implementation-plan.md]]'
  - 'follows [[sys:system/guideline/review-task.md]]'
  - 'uses [[user:guideline/write-software.md]]'
  - 'uses [[sys:system/guideline/write-javascript.md]]'
updated_at: '2025-07-26T00:00:00.000Z'
user_public_key: '0000000000000000000000000000000000000000000000000000000000000000'
---

<task>Execute a software implementation following an implementation plan</task>

<context>This workflow assumes an implementation plan already exists that identifies what needs to be done. The workflow focuses on setting up the work environment and executing the planned changes step by step. Read and follow [[user:guideline/write-software.md]] for general software development practices and [[sys:system/guideline/write-javascript.md]] for JavaScript-specific guidelines.</context>

<instructions>

Before starting, read [[sys:system/guideline/implement-software-task.md]] and [[sys:system/guideline/review-task.md]].

## Setup Phase

1. **Locate Implementation Plan**

   - Find the implementation plan in the task file or text entity
   - Confirm the plan includes specific file changes and tasks
   - Note the location and format of the implementation plan

2. **Set Up Work Environment**
   - Navigate to the target repository (not user-base)
   - Verify clean state on main/master branch
   - Create worktree using pattern: `git worktree add -b {branch-name} ../{repo-name}-worktrees/{branch-name}`
   - Navigate to worktree directory
   - Install dependencies: `yarn install`
   - Document working directory path

## Execution Phase

3. **Work on First Task Only**

   - Select the first uncompleted task from the implementation plan
   - Read and follow [[user:guideline/write-software.md]] for variable naming and DRY principles
   - Read and follow [[sys:system/guideline/write-javascript.md]] for JavaScript-specific practices (ES modules, function parameters, etc.)
   - Make the required changes for that task only
   - Mark the task as completed in the implementation plan using checkbox format: `- [x]`

4. **Update Implementation Plan**

   - Update the implementation plan with task completion progress
   - If during implementation you discover the plan needs changes (drift detected):
     - STOP implementation immediately
     - Present the proposed changes and reasoning for review
     - Wait for explicit approval before updating the plan
     - Only continue after plan changes are approved

5. **Stop for Review**
   - Do NOT proceed to the next task automatically
   - Present what was completed and current plan status
   - Wait for explicit instruction to proceed with next task or all remaining tasks

## Quality Assurance

6. **When All Tasks Complete** (only after explicit instruction)
   - Run full test suite: `yarn test:unit --reporter min` and `yarn test:integration --reporter min`
   - Run code quality checks: `yarn lint` and `yarn typecheck` if available
   - Review all changes: `git diff --name-only` and `git status`
   - Stage changes: `git add .`

## Key Rules

- Work on ONE task at a time from the implementation plan
- ALWAYS update the implementation plan with progress after each task
- If plan changes are needed (drift), STOP and get approval before updating
- STOP after each task for review unless explicitly told to continue with all remaining tasks
- Use the worktree setup pattern from the guidelines
- Document working directory and verify before each operation
  </instructions>

<output_format>
After completing each task:

**Task Completed**: [Description of task]

**Changes Made**: [Brief summary of what was changed]

**Files Modified**:

- [List of file paths for edited files]
- [List of file paths for created files]

**Implementation Plan Updated**: [Confirmation that progress was marked and any plan changes made]

**Working Directory**: [Current worktree path]

**Next Step**: Ready for review. Please confirm to proceed with next task or specify "continue with all remaining tasks"
</output_format>
