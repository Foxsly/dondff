---
title: 'Write Software Implementation Plan'
type: 'guideline'
description: |
  Guidelines for writing software implementation plans
created_at: '2025-05-27T18:10:20.238Z'
entity_id: 'e76459ed-cea8-4e1e-8601-8d3d1fc5ccb5'
globs:
tags:
updated_at: '2025-05-27T18:10:20.238Z'
user_public_key: '0000000000000000000000000000000000000000000000000000000000000000'
---

- List all files that need to be modified or created, using their full paths.
- For each file, clearly describe the specific changes or additions required, without including any example code.
- Break down the implementation into clear, actionable steps, ensuring each step is concise and unambiguous.
- Use a markdown task list format so that progress can be tracked easily.
- Use markdown checkboxes `- [ ]` for incomplete tasks and `- [x]` for completed tasks.
- **STRICTLY AVOID** emojis in implementation plans - they make plans look unprofessional and add no value.
- Ensure the plan is self-contained and understandable without additional context.
- Use consistent terminology and formatting throughout the plan.
- Review the plan for completeness and accuracy before sharing.
- Include the purpose of each change to provide context.
- **Avoid numbered lists** - use logical groupings, categories, or phases instead of sequential numbering to prevent staleness when plans are modified.
- **Task item structure should be flexible** - allow for varying levels of detail, code snippets, file paths, and implementation notes as appropriate for different types of work.
- **Progress tracking** - all task items must use `- [ ]` checkbox format to enable progress tracking.

## Template

````markdown
# Implementation Plan: [Title]

## Overview

- [High-level goals and purpose of the implementation]
- [Expected outcomes]

## Background

- [Existing code, configuration, or documentation related to the task]
- [Current system state and relevant context]
- [Dependencies and integrations]

## Design

- [High-level approach and organization]
- [Proposed folder and file structure]
- [Key functions, classes, and modules to be created]
- [Relationships between components]
- [New dependencies or configuration requirements]
- [Integration points with existing code]

## Notes

- [Notable implementation details]
- [Guidance on approach]
- [Relevant resources and references]
- [Potential challenges and considerations]

## Tasks

### Core Implementation

- [ ] **[File path to create or modify]**

  - File: `[full/path/to/file]`
  - Purpose: [Why this change is needed]
  - Changes:
    - [Specific modification 1]
    - [Specific modification 2]

- [ ] **[Alternative format with code details]**
  - File: `[full/path/to/file]`
  - Purpose: [Why this change is needed]
  - Changes:
  ```language
  - Remove: old_function_name
  - Implement: new_function_name
  - Add: new_feature_logic
  - Update: configuration_settings
  ```
````

### Configuration & Setup

- [ ] **[Configuration file updates]**
    - [Configuration changes needed]
    - [Environment setup requirements]

### Testing & Validation

- [ ] **[Test implementation]**
    - [Test scenarios to implement]
    - [Validation steps required]

```

```