---
slug: base/system/workflow/write-software-implementation-plan
title: "Workflow — Write Software Implementation Plan (HITL)"
version: 0.1
---

## Purpose
Generate a high-quality implementation plan from a **guideline template**, pause for human approval, then iterate if needed.

## Inputs
- **task_title**: short title for the work
- **context**: 3–7 bullets of scope/constraints
- **repo**: (optional) relevant paths or modules
- **acceptance_nudges**: (optional) any must-have checks

## Steps
1. **Load Guideline Template**: `ai/guidelines/write-software-implementation-plan.md`
2. **Fill Sections** using inputs and project conventions in `development.guidelines.md`.
3. **Constrain** the scope with clear non-goals and invariants.
4. **Define Tests** (unit + E2E), risks, rollback, and Done-When checklist.
5. **Output** a single Markdown plan.
6. **HITL Gate**: Present the plan to the human and await feedback.
    - If **approved**, persist the plan (commit or attach to PR description later).
    - If **changes requested**, revise once and return to gate.

## Output
- `Implementation Plan — ${task_title}.md` (Markdown content)

## Notes
- Keep it concise; avoid boilerplate.
- Make acceptance criteria testable.
- Cross-reference `/backend/e2e-todo.md` where applicable.
---
title: Write Software Implementation Plan
type: workflow
description: >-
Write implementation plans for software tasks by understanding requirements, analyzing codebase,
and planning changes
created_at: '2025-06-18T00:44:36.058Z'
entity_id: 2928d808-7e56-42aa-a888-8626046b35e8
relations:
- implements [[sys:system/schema/workflow.md]]
- follows [[sys:system/guideline/write-software-implementation-plan.md]]
- uses [[sys:system/guideline/write-entity.md]]
  updated_at: '2025-06-18T00:44:36.062Z'
  user_public_key: 0000000000000000000000000000000000000000000000000000000000000000
---

<task>Write a software implementation plan by analyzing a task and breaking it into specific file changes</task>

<context>
Create structured implementation plans by understanding requirements, analyzing codebase, and planning changes. This is done in three phases: research, design, and task planning. Each phase requires explicit user confirmation before proceeding to the next.
Create structured implementation plans by understanding requirements, analyzing codebase, and planning changes. This is done in three phases: research, design, and task planning. Each phase requires explicit user confirmation before proceeding to the next.
</context>

<instructions>
## Important: Phase Progression

- **DO NOT** move to the next phase until the user explicitly confirms they are ready
- Users may iterate on each phase as long as needed
- Wait for explicit statements like "proceed to design phase" or "let's move to task planning"
- Each phase builds on the previous one but can be refined based on feedback

## Phase 1: Research and Information Gathering

1. **Use sub-agents to research the codebase**:
    - Launch a general-purpose agent to:
        - Search for existing code related to the task
        - Identify current patterns and conventions
        - Find relevant configuration and documentation
        - Locate similar implementations or related functionality
2. **Gather information from the user**:

    - Ask clarifying questions about requirements
    - Understand the problem being solved
    - Clarify any ambiguous instructions
    - Confirm understanding of expected outcomes

3. **Create initial plan outline**:

    - Write only the following sections:
        - **Overview**: High-level goals and expected outcomes
        - **Background**: Summary of research findings
        - **Notes**: Initial thoughts and considerations
    - Do not include Design or Tasks sections yet

4. **Stop for review**:
    - Present the research findings to the user
    - Ask if they want to refine or expand the research
    - Wait for explicit confirmation to proceed to Phase 2
    - Iterate on this phase as much as needed

## Phase 2: Design

5. **Only after user confirms Phase 1**:

    - Create the **Design** section:
        - Describe the high-level approach
        - Outline proposed file organization
        - Identify key components and their relationships
        - Note new dependencies or configuration needs
        - Explain integration points with existing code

6. **Stop for design review**:
    - Present the design to the user
    - Ask for feedback on the proposed approach
    - Refine the design based on feedback
    - Wait for explicit confirmation to proceed to Phase 3
    - Iterate on this phase as much as needed

## Phase 3: Task Planning

7. **Only after user confirms Phase 2**:

    - Create detailed tasks:
        - List all files that need changes
        - Describe specific modifications required
        - Explain the purpose of each change
        - Order tasks for logical implementation

8. **Follow the guideline**:

    - Read and Use the template from [[sys:system/guideline/write-software-implementation-plan.md]]
    - Ensure all sections are complete
    - Review for clarity and completeness

9. **Final review**:

    - Present the complete plan to the user
    - Make any final adjustments based on feedback

10. **Save the implementation plan**:

- If a task entity is known, update the task entity file with the implementation plan
- If no task entity is known:
    - MUST read [[sys:system/schema/task.md]] and use entity type "task"
    - MUST read [[sys:system/guideline/write-entity.md]] and use it to write the entity file
    - MUST read [[sys:system/text/base-uri.md]]
    - Create a new task entity using `entity_create` tool
    - Set `title` to the task name and include a brief `description`
    - Initialize relevant fields where useful (e.g., `status: Planned`, `priority: Medium`)
    - Include the full implementation plan in the `entity_content` field
    - Organize the entity under the appropriate subfolder in `task/` (e.g., `task/base/`, `task/league/`, `task/infrastructure/`, `task/github/`). If uncertain, use `task/base/`.
    - Check the `tag/` directory for any applicable tags and add them to the entity metadata/relations using the base URI link format `[[user:tag/<tag>.md]]` (e.g., `[[user:tag/property-management.md]]`).
    - Save the entity file to the filesystem using the `entity_create` tool

</instructions>

<output_format>
After writing and saving the implementation plan, display:

**Implementation Plan Created**

Path: [base_uri of the updated task or created task entity]

Title: [title of the entity]

Description: [brief description of what the plan covers]
</output_format>
