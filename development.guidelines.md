# 🧭 DOND Backend Development Guidelines

This document captures the key principles and practices that guide backend development for the **Deal or No Deal Fantasy (DOND)** project.

It reflects the patterns and reasoning that have evolved across the codebase — particularly around **domain design, repository structure, testing, and type safety**.

## 🪶 Summary

- Domain-first, strongly typed architecture with `typia` validation.
- Repositories own all persistence logic and return rich domain entities.
- Keep modules focused: Controller → Service → Repository → DB.
- Use append-only, explicit migrations (no destructive schema changes).
- Prefer UUIDs for all abstract primary keys.
- SQLite for local dev, PostgreSQL for staging/production.
- Consistent ISO string timestamps and JSON-safe serialization.

---

## ⚙️ Core Principles

### 1. Domain-first Design
- Entities represent business intent, not just tables.  
- Database schemas follow the **domain**, not the other way around.  
- Each domain concept (`League`, `Team`, `LeagueSettings`, etc.) has:
  - An interface (`IEntity`) defining the rich domain model.
  - DTOs for creation/update shaped by `typia` validation.
  - Repositories that translate between DB and domain.
- Prefer **UUIDs for all primary keys**, even for entities that could use numeric IDs.  
  This ensures cross-environment consistency and simplifies merging data across environments.

### 2. Strong Typing and Validation
- Use **TypeScript types** and **typia** validation for all DTOs.  
- Keep DB → domain transformations explicit (e.g., `positions: string[]` ↔ `TEXT JSON`).  
- Use narrow unions (`ScoringType = 'PPR' | 'HALF_PPR' | 'STANDARD'`) instead of strings.  
- Prefer compile-time errors to runtime surprises.

### 3. Repository Pattern with Explicit Boundaries
- Each repository:
  - Encapsulates DB access and serialization logic.
  - Returns **domain entities only**, never raw rows.
  - Handles cross-database (SQLite/Postgres) differences cleanly.
- Abstract base repositories (e.g., `LeaguesRepository`) define the contract.
- Concrete classes (e.g., `DatabaseLeaguesRepository`) implement persistence.

### 4. Simplicity over Magic
- Avoid heavy NestJS abstractions; keep modules focused:
  - Controllers = API routes
  - Services = business logic
  - Repositories = persistence
- Favor **pure helpers** outside classes for data transformations (e.g., `parsePositions`).
- Explicit, readable code > clever metaprogramming.

### 5. Consistent Typing Across Layers
| Layer | Example Type | Notes |
|--------|---------------|-------|
| DB | `TEXT` / `timestamptz` | Real storage representation |
| Repository | `string` / `Date` (depending on logic) | Internal conversions |
| Domain / DTO | `string` | JSON-friendly |

All timestamps are stored and represented as **ISO strings** for consistency.

### 6. Testing Philosophy
- **Unit tests** mock repositories and validate logic in isolation.
- **E2E tests** verify controller + service integration using real Nest modules.
- External dependencies (e.g., Sleeper API) are **mocked via `nock`** in E2E tests.
- SQLite is used for local integration tests to mirror production behavior with minimal setup.

### 7. Environment and Database Strategy
- Local: SQLite (fast, simple, ephemeral)
- Staging/Prod: PostgreSQL
- `DB_ENGINE` toggle in `database.ts` determines the dialect at runtime.
- Migrations are explicit and versioned via **Kysely**.
- Schema consistency > auto-generation.

### 8. Coding Style
- **Explicit naming**: methods and tables read like sentences (`findLeagueUsers`, `createLeagueSettings`).
- **Single responsibility**: each class/module has one purpose.
- **Append-only data** when appropriate (e.g., `league_settings` history).
- **Tests and migrations live alongside the module** they belong to (`src/{module}/`).

### 9. Developer Experience
- WebStorm or VSCode debugging integrated with Jest and `tsx`.
- Consistent Jest configuration for both **unit** and **E2E** tests.
- Reproducible local setup (port `3001`, SQLite DB, `npm run migrate`).
- CI and dev environments should run tests identically.

### 10. Incremental, Traceable Schema Evolution
- Every schema change goes through a **migration file** (e.g., `0005_add_team_entry.ts`).
- Use clear naming and include both `up` and `down` methods.
- Avoid destructive changes in development; prefer additive/append-only evolution.

---

## 🧩 Architectural Snapshot

```
Controller  →  Service  →  Repository  →  Kysely(DB)
   │              │           │
   ▼              ▼           ▼
  DTOs        Domain       Raw SQL/Schema
               Entities
```

- Controllers define HTTP routes (via `@TypedRoute`).
- Services coordinate domain logic.
- Repositories encapsulate persistence.

---

## 🧠 AI-Assisted Development Prompt

Use this prompt when working with AI to extend or refactor the codebase:

> **Prompt:**
>  
> You are contributing to a NestJS + Kysely backend for a Deal-or-No-Deal-style fantasy football app.  
> Follow these guidelines:
> - Write clean, explicit, **domain-driven** TypeScript.  
> - Use **typia** for validation and DTO typing.  
> - Database access goes through repositories using **Kysely** with a `DB` interface.  
> - Always serialize/deserialize complex fields (e.g., JSON TEXT columns) in the repo.  
> - All timestamps are stored and represented as ISO strings.  
> - Use `@TypedRoute` decorators instead of Nest’s native ones.  
> - Ensure new features have unit or E2E tests under the relevant module folder.  
> - Keep helper functions pure and outside classes unless they depend on injected context.  
> - Maintain clear naming, append-only migrations, and type-safe repository contracts.  
>  
> When adding new code, consider:
> 1. Does this logic belong in the controller, service, or repository?  
> 2. Does it align with domain-driven naming and existing patterns?  
> 3. Are tests verifying behavior, not implementation details?  
>  
> Output all code in the existing project structure and maintain consistency with the style of current modules.

---

**Last updated:** October 2025

This document should evolve with the project. Update it when patterns change or new conventions emerge.
