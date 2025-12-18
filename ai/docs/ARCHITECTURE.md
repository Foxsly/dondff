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

Controllers:

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

Services:

- Implement business logic and workflows.
- Coordinate repositories and external integrations (e.g., Sleeper API).
- Own state transitions and invariants.
- Produce outputs safe for the client (no hidden mappings leaked).

Service invariants:

- All fairness-critical game logic lives in services.
- Services may depend on multiple repositories.
- Services may apply engine-aware logic only through repository abstractions.

### Repositories

Repositories:

- Are the only layer allowed to execute SQL.
- Encapsulate all Kysely query composition.
- Normalize/serialize DB-specific behavior (JSON handling, timestamps) to domain types.
- Keep queries deterministic, readable, and testable.

Repository invariants:

- Do not contain business logic; only persistence and retrieval.
- Prefer returning domain types (`ITeam`, `ITeamEntry`, etc.) and keep casting/local variables explicit.
- Where engine differences exist, implement them in repository helpers (not in services/controllers).

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

## Prefer X over Y

- Prefer `@TypedRoute` over NestJS native decorators (`@Get`, `@Post`, etc.) to ensure compile-time and runtime type safety.
  - Exception: `@Query` for query parameters, because it allows you to specify the query param name and the type-safety benefits are minimal
- Prefer derived DTOs (`Pick`, `Omit`, utility types) over hand-written request/response interfaces.
- Prefer a single domain entity definition over duplicating entities per layer (controller/service/repository).
- Prefer services owning workflows over controllers orchestrating logic.
- Prefer repositories encapsulating all SQL over inline queries or query construction in services.
- Prefer explicit engine-aware branching in repositories over leaking DB differences into services.
- Prefer Postgres-first implementations with SQLite as an explicitly supported exception.
- Prefer append-only migrations over in-place schema changes.
- Prefer backend-generated randomness and game state over client-generated logic.
- Prefer returning domain-safe objects over raw database rows.
- Prefer explicit local variables for DB results over deeply chained expressions when clarity matters.
- Prefer E2E tests for API behavior over unit tests that mock persistence.
- Prefer consistent error contracts over ad-hoc error handling.
- Prefer camelCase naming consistently across TypeScript, tables, and columns.
- Prefer removing unused dependencies over tolerating build bloat.

## Never do X

- Never put business logic, randomness, or game-state transitions in the frontend.
- Never leak unrevealed mappings (e.g., player-to-case assignments) to the client.
- Never execute SQL or touch Kysely directly from controllers or services.
- Never duplicate domain entities across layers; there must be a single source of truth.
- Never create ad-hoc DTOs when a derived utility type (`Pick`, `Omit`, etc.) suffices.
- Never branch on database engine in controllers or services; engine differences belong in repositories only.
- Never mutate persisted game state without recording an audit/event record.
- Never rely on client-provided values for fairness-critical decisions.
- Never introduce breaking schema changes without an explicit migration.
- Never bypass foreign key constraints or disable them for convenience.
- Never allow silent failure of invalid state transitions; always return explicit errors.
- Never introduce new endpoints without E2E coverage.
- Never hardcode environment-specific values into application logic.
- Never optimize for SQLite at the expense of Postgres correctness.
- Never accept unclear abstractions that obscure ownership of state or logic.

## Red flags during code review

- Business logic or game rules implemented in controllers or the frontend.
- Any client-visible response that could allow inference of unrevealed game state.
- Direct use of Kysely or raw SQL outside a repository.
- DTOs or request/response types that duplicate existing entities instead of deriving from them.
- Conditional logic in services/controllers based on database engine.
- Missing audit/event persistence for state-changing operations.
- New endpoints without corresponding E2E tests.
- E2E tests that do not follow established patterns in existing specs.
- Silent handling of invalid state transitions (e.g. returning success on no-op updates).
- Frontend logic that assumes backend behavior instead of reacting to explicit API responses.
- Hardcoded environment values (URLs, secrets, feature flags).
- Schema changes without migrations or with non-reversible migrations.
- Overly complex chained DB calls that reduce readability and debuggability.
- Added dependencies without justification or size impact consideration.
- Logic that makes it unclear which layer owns a piece of state or decision-making.

## Diagram conventions

We use text-based diagrams so they are diffable, reviewable, and AI-editable.

- Prefer **Mermaid** diagrams embedded in Markdown.
- Prefer **sequence diagrams** for API flows.
- Prefer **state diagrams** for domain state transitions.
- Always include these participants in sequence diagrams (when applicable):
  - `UI`
  - `Controller`
  - `Service`
  - `Repository`
  - `DB`
  - `External API` (e.g. Sleeper)
- Use stable names (`TeamsController`, `TeamsService`, `TeamsEntryRepository`, etc.).
- Annotate **invariants** and **visibility rules** in notes (`Note over ...`).
- Do not include secrets, credentials, or environment-specific values.
- Keep diagrams focused:
  - One diagram per endpoint or cohesive flow.
  - Avoid implementation-level details that will churn.
