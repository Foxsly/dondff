# CLAUDE.md — DONDFF Project Guide

## Workflow

- **Do not commit changes unless explicitly asked.** Make changes to files and let the user review before committing.
- **Do not push unless explicitly asked.**
- When creating a branch, follow the naming convention: `feat/{short-description}` or `fix/{short-description}`.
- Always read a file before editing it.

---

## Project Overview

Deal or No Deal Fantasy Football — a game where users draft their lineup by playing a Deal or No Deal-style case selection game using real Fantasy Football projections. The highest-scoring lineup at end of week wins.

**Stack:**
- Backend: NestJS + Kysely + typia + Nestia (`@nestia/core`)
- Frontend: React + TypeScript + Tailwind CSS
- Database: PostgreSQL (default/production), SQLite (local dev / tests)
- Docker Compose for local Postgres

**Repo:** https://github.com/Foxsly/dondff

---

## Backend Architecture

Full details: `ai/docs/ARCHITECTURE.md` and `development.guidelines.md`

### Strict layering — Controller → Service → Repository → DB

**Controllers**
- Define HTTP routes using `@TypedRoute` (not native `@Get`, `@Post`, etc.)
- Exception: use `@Query` for query parameters — `@TypedParam` for path params, `@TypedBody` for request body
- No business logic, no DB access, no game state decisions
- Return domain-safe response objects only

**Services**
- Own all business logic, state transitions, game logic, and offers
- Coordinate repositories and external APIs (e.g., Sleeper)
- Never execute SQL or touch Kysely directly

**Repositories**
- The ONLY layer that executes SQL via Kysely
- Encapsulate all query composition, serialization, and engine-aware differences
- Return domain types (`ITeam`, `ITeamEntry`, etc.) — never raw DB rows
- Engine branching (SQLite vs Postgres) belongs here, never in services or controllers

### Entities and DTOs
- Entities are the single source of truth for API shapes
- DTOs are utility types derived from entities: `Pick<>`, `Omit<>`, `Partial<>`
- Never duplicate type definitions across layers
- All names are **camelCase** — TypeScript properties, table names, column names, everything
- Use `Generated<T>` for DB-managed columns (`createdAt`, `updatedAt`) in table types

### Database
- **Postgres is the default** — treat it as the production baseline
- SQLite is for local dev and E2E tests only
- Engine-aware query branching goes in repository helpers only
- Migrations are **append-only** — never destructive schema changes
- Every schema change requires an explicit migration file
- Migration naming: `0007_short_description.ts`

### Prefer / Never
See `ai/docs/ARCHITECTURE.md` for the full "Prefer X over Y" and "Never do X" lists. Short version:
- Prefer `@TypedRoute` over native NestJS decorators
- Prefer derived DTOs over hand-written interfaces
- Prefer backend-generated randomness over anything client-side
- Never put game logic, randomness, or state decisions in the frontend
- Never expose player-to-case mappings before the backend reveals them
- Never bypass foreign key constraints

---

## Game Integrity — Critical Invariants

- The frontend must **never** know which player is in which case until the backend reveals it
- All case elimination, offer calculation, and scoring happen server-side
- Reset limits and state transitions are enforced server-side
- API responses must contain only the minimum information needed to render the UI
- All state transitions must be persisted (`teamEntryAudit`, `teamEntryEvent`)
- If something feels complex on the frontend, it probably belongs in the backend

Full game flow and state machine: `ai/docs/GAME_FLOW.md`

---

## Frontend Conventions

- Frontend is a **thin rendering client** — no game logic, no randomness, no case/player mapping
- React components are `React.FC` with typed props interfaces
- Event handlers are named with `handle` prefix (`handleClick`, `handleKeyDown`)
- Use `const` for component and function declarations
- Tailwind CSS for styling — no inline styles unless dynamic
- No Material UI — use Tailwind or lightweight custom components
- Early returns preferred for readability
- API base URL via `window.RUNTIME_CONFIG?.API_BASE_URL` — never hardcoded

Auth context lives in `AuthContext.tsx`. Auth is currently email-based localStorage only (no real auth yet).

---

## Testing

Full details: `development.guidelines.md` §6

- **Prefer E2E tests for all API behavior** — file pattern: `src/<module>/<module>.e2e.spec.ts`
- Every new or modified endpoint requires:
  - At least one happy-path E2E test
  - At least one negative/error-path test (400, 404, 409, etc.)
- Unit tests for isolated pure logic only (helpers, calculations)
- External APIs (Sleeper) are mocked via `nock` in E2E tests
- After adding/modifying endpoints: update `backend/e2e-todo.md`
- Error contract: `{ statusCode, message }` consistently

Test commands:
```bash
npm run test:unit    # unit tests only
npm run test:e2e     # E2E tests only
npm run test         # both
```

---

## Local Development

```bash
# 1. Start Postgres
docker compose up dondff-postgres -d

# 2. Backend (Terminal 1)
cd backend && npm run migrate && npm run start:dev   # http://localhost:3001

# 3. Frontend (Terminal 2)
cd frontend && npm start                             # http://localhost:3000
```

Backend env: `backend/.env` — Postgres by default, SQLite commented out as alternative.
Root `.env` — Docker Compose Postgres credentials (copy from `.env.example`).

---

## Key File Locations

| What | Where |
|------|-------|
| Backend modules | `backend/src/{module}/` |
| DB migrations | `backend/src/infrastructure/database/migrations/` |
| DB types (Kysely) | `backend/src/infrastructure/database/types.d.ts` |
| Frontend components | `frontend/src/components/` |
| Frontend API client | `frontend/src/api/client.ts` |
| Shared frontend types | `frontend/src/types.ts` |
| Architecture docs | `ai/docs/ARCHITECTURE.md` |
| Game flow spec | `ai/docs/GAME_FLOW.md` |
| AI context (dense) | `ai/docs/AI_CONTEXT.md` |
| E2E coverage tracker | `backend/e2e-todo.md` |
| Dev guidelines | `development.guidelines.md` |
