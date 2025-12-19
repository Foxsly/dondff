# General Guidelines
- Do not commit changes, just make them in the file so that I can review them

# Backend Architecture

This document describes the backend layering, invariants, and cross-cutting conventions for DONDFF.

## Goals

- Maintain a clear separation of responsibilities across controller/service/repository layers.
- Keep business logic server-side and testable.
- Preserve a stable, typed API contract using `@nestia/core` typed routes.
- Support multiple database engines (Postgres as default; SQLite as exception) without leaking engine concerns into higher layers.

## Tech stack

- **NestJS** application structure
- **@nestia/core** `@TypedRoute` for API routing and runtime validation
- **typia** for DTO validation and type-driven serialization
- **Kysely** for database access (type-safe SQL builder)
- **Postgres** as primary production DB
- **SQLite** for local/testing and lightweight environments

## Layering

### Controllers
- Define HTTP routes using `@TypedRoute`.
- Validate request/response shapes through typia/Nestia.
- Perform minimal request parsing and input shaping.
- Delegate business logic to services.
- Must not contain database queries.

Controller invariants:

- Route handlers return domain-safe response objects.
- No direct access to Kysely or database connections.
- Consistent error contract (status + message structure) aligned with existing modules.

### Services
- Implement business logic and workflows.
- Coordinate repositories and external integrations (e.g., Sleeper API).
- Own state transitions and invariants.
- Produce outputs safe for the client (no hidden mappings leaked).

Service invariants:

- All fairness-critical game logic lives in services.
- Services may depend on multiple repositories.
- Services may apply engine-aware logic only through repository abstractions.

### Repositories
- Are the only layer allowed to execute SQL.
- Encapsulate all Kysely query composition.
- Normalize/serialize DB-specific behavior (JSON handling, timestamps) to domain types.
- Keep queries deterministic, readable, and testable.

Repository invariants:
- Do not contain business logic; only persistence and retrieval.
- Prefer returning domain types (`ITeam`, `ITeamEntry`, etc.) and keep casting/local variables explicit.
- Where engine differences exist, implement them in repository helpers (not in services/controllers).

AI Notes:
- Pay attention to which fields are available on the Entities being used
  - For example, `ITeamEntry` does not have `createdAt` or `updatedAt` fields, so those cannot be referenced in a `Kysely` query

### Entities and DTOs
- Entities represent domain contracts and are the source of truth for API shapes.
- DTOs should be derived from entities using utility types (`Pick`, `Omit`, etc.) and typia helpers.
- Avoid duplicating ad-hoc request/response shapes in separate files when a derived type is sufficient.

Type invariants:

- Prefer `camelCase` for TypeScript properties.
- Prefer `camelCase` for table and column names.
- Use `Generated<T>` for DB-managed timestamp columns (`createdAt`, `updatedAt`) in table types.

## Database engine support

### Postgres (default)

- Treated as the production baseline.
- Prefer Postgres-native JSON helpers where appropriate.
- Avoid Postgres-only SQL when the same behavior is needed on SQLite; if unavoidable, implement engine-aware repository branches.

### SQLite (exception)

- Used for local development and some test flows.
- Requires explicit foreign key enforcement:
    - `PRAGMA foreign_keys = ON` on each connection.
- JSON handling may require result parsing configuration depending on dialect setup.

### Engine-aware repository patterns

When a query must behave differently per engine:

- Implement a small helper inside the repository that branches by engine.
- Keep the service signature identical across engines.
- Unit test the query logic per engine where feasible; always include E2E coverage for API behavior.

## Game integrity invariants

- The client must never receive player-to-case mappings for unrevealed boxes.
- Randomization, elimination logic, offer calculation, and scoring must occur on the backend.
- API responses must contain only the minimum information needed to render the UI.
- All state transitions must be persisted (entries, audits, offers, events).

## Migrations

- Migrations are append-only.
- New tables/columns must be introduced via migration.
- Migrations must be runnable in containerized environments.
- If migration behavior must vary by engine, branch within migration logic in a controlled, explicit way.

## Testing strategy

### E2E tests

- Prefer E2E tests for API endpoints.
- For each new endpoint:
    - include at least one happy-path test
    - include at least one negative-path test
- Ensure tests follow existing patterns in `*.e2e.spec.ts` files.

### Unit tests

- Use unit tests for isolated pure logic (helpers, small computations) where appropriate.
- Keep heavy DB-integrated behavior covered by E2E tests.

## Error contract

- Use consistent HTTP status codes.
- Provide consistent JSON error payloads matching the existing backend conventions.
- Prefer explicit conflict errors for invalid state transitions (e.g., selecting a case twice).

## Code style expectations

- Prefer pure helper functions outside classes unless context-dependent.
- Use explicit variable naming for clarity.
- Keep implementation plans and tasks aligned with the repository’s workflow guidelines.
