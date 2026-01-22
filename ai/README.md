## AI Workflows & Prompts

This folder contains lightweight, human-in-the-loop (HITL) workflows and prompts that let ChatGPT:
1) draft a software implementation plan from a template,
2) generate code changes as unified diffs (without applying them),
3) wait for human approval, and
4) only then apply patches.

Based on https://base.tint.space/repository/active/base/system/text/system-design.md

### Structure
```
ai/
  workflows/
    write-software-implementation-plan.md
    implement-software-task.md
  guidelines/
    write-software-implementation-plan.md
    implement-software-task.md
  prompts/
    system.planner.md
    system.implementor.md
  state/.gitkeep     # optional local run logs
```

The **workflows** describe how the assistant should proceed step-by-step (with pause points).
The **guidelines** act as source-of-truth templates the assistant fills out (plans) or follows (implementation).
The **prompts** are system-role instructions tailored to this codebase (DOND: NestJS + Kysely + typia).

> When we ask the assistant to generate a patch, it will post a unified diff.
> We review, and if approved, we use “Apply Patch from Clipboard” in WebStorm.
