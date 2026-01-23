

# AI Context – DONDFF

This document is a **distilled, stable memory** of the DONDFF project intended for use by AI-assisted development tools (Aider, Copilot Chat, ChatGPT, etc.).

It captures **non-obvious architectural decisions, invariants, conventions, and intent** so future AI interactions do not have to rediscover them.

---

## Project Overview

DONDFF is a fantasy-sports game application with:

- **Backend**: NestJS + Kysely + Typia + Nestia
- **Frontend**: React (Create React App–style)
- **Database**: Postgres (default, production) with SQLite as a local/test exception
- **Infra**: Docker Compose, distroless + rootless containers

The core product requirement is **game integrity**: the backend must own all randomness, offers, eliminations, and mappings so the frontend cannot cheat by inspecting API responses.

---

## Backend Architecture

### Layering (Strict)

- **Controller**
  - Defines HTTP API shape only
  - Uses `@TypedRoute` (Nestia)
  - No business logic

- **Service**
  - Implements domain logic
  - Orchestrates repositories and external APIs (Sleeper)
  - Owns randomness, offers, eliminations, and game state transitions

- **Repository (Kysely)**
  - One repository per aggregate/table family
  - No cross-repository joins unless explicitly intended
  - Returns domain entities or typed rows

Controllers must **never**:
- Call Sleeper APIs directly
- Generate randomness
- Know about hidden mappings (e.g., which player is in which case)

---

## Domain Invariants (Critical)

### Game Integrity Rules

- Frontend must **never** know which player maps to which case until the backend reveals it
- All case elimination logic happens server-side
- Offers are derived from remaining cases only
- Reset limits and state transitions are enforced server-side

### State Ownership

- `TEAM_ENTRY` = authoritative game state
- `TEAM_ENTRY_AUDIT` = immutable history of events
- UI reflects backend state; it does not derive it

---

## Entities & Typing

### Naming

- **Everything is camelCase**
  - Table names
  - Column names
  - Entity properties
  - DTOs

### Entities vs Tables

- Domain interfaces (e.g. `ITeamEntry`) describe logical shape
- Kysely table types extend entities and mark DB-managed fields as `Generated<>`

Example pattern:

```ts
export interface ITeamEntry {
  teamEntryId: string;
  teamId: string;
  position: string;
  resetCount: number;
  selectedBox: number | null;
  status: TeamEntryStatus;
}

export type TeamEntryTable = ITeamEntry & {
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
};
```

### DTOs

- DTOs are **utility types derived from entities**
- DTOs live next to entities (no separate dto folders)
- Prefer `Pick<>`, `Omit<>`, `Partial<>`

---

## Database & Migrations

### Engines

- **Postgres is the default** (production)
- SQLite is supported for local dev / tests only

### SQLite Gotchas

- `PRAGMA foreign_keys = ON` is required
- `ON DELETE CASCADE` silently fails without it

### Engine-Aware Queries

- Avoid Postgres-only helpers (`json_object`) without fallbacks
- Prefer:
  - Kysely helpers when portable
  - Engine-branching where unavoidable

---

## Testing Strategy

### E2E Tests

- Use NestJS app bootstrap
- Follow patterns established in `teams.e2e.spec.ts`
- Tests must:
  - Create all required parent records (FKs enforced)
  - Assert response shape, not just status codes

### Unit Tests

- Typia transforms require:
  - `isolatedModules: false`
  - `ts-patch` installed

---

## Frontend Architecture

### Principles

- Frontend is a **thin client**
- No game logic
- No randomness
- No case/player mapping

### Auth Model (Current)

- No real authentication yet
- "Login" is selecting an existing user by email
- Auth state is stored in `AuthContext`

Navbar rendering depends on `user !== null`

---

## Frontend–Backend Contract

### Environment Configuration

- Frontend API base URL is **runtime-configurable**
- No hardcoded `backend:3001`
- Use env or injected runtime config (not compile-time constants)

Example:

```js
const API_BASE = window.RUNTIME_CONFIG?.API_BASE_URL ?? '/api';
```

---

## Docker & Deployment

### Philosophy

- **Build once, deploy everywhere**
- No environment-specific logic baked into images

### Containers

- Backend: distroless, rootless
- Frontend: static build, minimal runtime

### Compose

- Postgres initialized via env vars on first boot
- DB credentials changes require volume reset

---

## Game Flow (Canonical)

1. User clicks "Play"
2. `POST /teams`
   - Creates team
   - Generates cases (`TEAM_ENTRY`, `TEAM_ENTRY_AUDIT`)
3. `GET /teams/{teamId}/cases`
4. User selects a case
5. Backend eliminates cases + returns offer
6. User accepts/declines
7. Repeat until terminal state

Frontend never knows hidden mappings.

---

## Conventions for AI Tools

When modifying this project:

- Do **not** invent new endpoints if existing ones can be reused
- Prefer backend changes over frontend workarounds
- Never leak game state or randomness to the client
- Follow existing repository and test patterns
- Ask before introducing new tables or services

If something feels complex on the frontend, it probably belongs in the backend.

---

**This file is intentionally opinionated.**
It exists to prevent architectural drift when using AI tools.