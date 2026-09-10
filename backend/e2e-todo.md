# E2E Test TODOs

This document tracks remaining and current **end-to-end (E2E)** coverage across backend modules. Items are grouped by module and marked complete `[x]` when covered by existing specs. Use these as checklists when expanding `*.e2e.spec.ts` suites.

> **E2E harness:** suites boot a full `AppModule` (or module subset) against an **in-process PGlite (Postgres 16)** instance — no Docker needed. `createTestApp()` runs `migrateToLatest()` for the full app; per-file instances isolate state, and `resetDatabase(app)` truncates all tables between tests.

---

## Leagues (`src/leagues/leagues.e2e.spec.ts`)

### ✅ Covered
- [x] `POST /leagues` — create league (assert persisted with `GET /leagues/:id`).
- [x] `GET /leagues/:id` — fetch created league by id.
- [x] `GET /leagues` — contains newly created leagues (presence check).
- [x] `PATCH /leagues/:id` — happy path (update name), 404 unknown id, and 400 on empty name.
- [x] `DELETE /leagues/:id` — happy path (then `GET /leagues/:id` → 404).
- [x] `DELETE /leagues/:id` — deleting same league twice returns 404.
- [x] `GET /leagues` — deleted league is excluded after deletion.
- [x] `GET /leagues/:id/users` — empty-state then populated.
- [x] `PUT /leagues/:id/users` — add user as owner; list shows membership.
- [x] `PUT /leagues/:id/users/:userId` — update membership role (owner → member).
- [x] Add second user and verify lists/roles across update.
- [x] `DELETE /leagues/:id/users/:userId` — remove user (true on first remove).
- [x] `DELETE /leagues/:id/users/:userId` — removing same user twice → 404.
- [x] `POST /leagues/:id/settings` — create settings v1 (fields verified).
- [x] `POST /leagues/:id/settings` — create settings v2 and verify latest reflects v2.
- [x] `GET /leagues/:id/settings/latest` — returns latest (v2) settings.
- [x] `GET /leagues/settings/:settingsId` — returns settings by id (v1).
- [x] Settings **negative cases** — unknown settings by-id → 404.
- [x] Settings **validation edges** — invalid `scoringType` → 400; valid payload seeds non-duplicate default positions (`GET /leagues/:id/positions`).
- [x] Settings **cross-league safety** — path `leagueId` trusted over body; no leakage between leagues.
- [x] Settings **burst writes** — latest remains the truly newest version.
- [x] Settings **enum validation & temporal ordering** — invalid enum rejected; `latest` returns newest via `createdAt desc` (and `leagueSettingsId` tie-break).
- [x] `GET /leagues/:id/positions` — returns server-seeded default positions from `league_settings_position`.

### ⏭️ Remaining / Next Up
- [ ] `GET /leagues` — sorting/pagination semantics (when implemented).
- [ ] `PATCH /leagues/:id` — additional validation: whitespace-only names; overly long names; unchanged name (no-op behavior).
- [ ] Users add **idempotency policy** for duplicate `PUT /:id/users`:
    - [ ] Duplicate with **same role** ⇒ no change (document behavior; status vs silent no-op).
    - [ ] Duplicate with **different role** ⇒ decide: no-op vs update (current upsert test is skipped).
- [ ] Users endpoints w/ **unknown league** — `GET/PUT/DELETE` on non-existent league → 404.
- [ ] Settings: enforce **integer-only** pool sizes (reject floats) if required.
- [ ] Settings: define/verify **max positions** length (if domain caps roster slots).
- [ ] Settings: **latest** tie-breaker if timestamps equal (define secondary key order and assert).
- [ ] Teams: `GET /leagues/:id/teams` **populated** once team creation endpoints are available (use `teamFactory`/`teamPlayerFactory`).
- [ ] Error contract: assert consistent `{ statusCode, message }` payloads for 400/404.

---

## Users (`src/users/users.e2e.spec.ts`)

> These items reflect desired coverage; check off as you confirm or add tests.

### Desired Coverage
- [ ] `POST /users` — create; validation errors: missing/invalid email; duplicate email conflict (if unique).
- [ ] `GET /users/:id` — happy path; 404 unknown id.
- [ ] `PATCH /users/:id` — update name/email; 400 on invalid; conflict on email change if unique.
- [ ] `DELETE /users/:id` — happy path; second delete → 404; ensure removal from `GET /leagues/:id/users`.
- [ ] `GET /users` — list; pagination/sorting (if implemented).

### Integration with Leagues
- [ ] After user deletion, `GET /leagues/:id/users` reflects cascade/soft-delete policy (decide and assert).

---

## Sleeper (`src/external-providers/sleeper/sleeper.e2e.spec.ts`)

> External providers are mocked via `nock`; fixtures live in `__fixtures__/`.

### ✅ Covered
- [x] `GET /sleeper/state` — returns transformed state (mocked, from `sleeper-state.test.json`).
- [x] `GET /sleeper/stats/:year/:week` — returns transformed stats (mocked).
- [x] `GET /sleeper/projections/:year/:week` — returns transformed projections (mocked).

### ⏭️ Remaining / Next Up
- [ ] Upstream errors: propagate 4xx/5xx with clear error messages.
- [ ] Timeouts / retry behavior (if implemented).
- [ ] Caching semantics (if any): warm cache, subsequent reads from cache; invalidation policy.

---

## Teams (`src/teams/teams.e2e.spec.ts`)

### ✅ Covered
- [x] `POST /teams` — create team with valid user/league/event-group FKs (Sleeper projections mocked).
- [x] `GET /teams` — list includes the created team and exposes `players` array.
- [x] `GET /teams/:id` — fetch a team by id.
- [x] `PATCH /teams/:id` — update team fields and reflect on subsequent reads.
- [x] `DELETE /teams/:id` — remove team and exclude it from subsequent listings.
- [x] Negative: `PATCH/GET/DELETE` unknown team id → 404.

### ⏭️ Remaining / Next Up
- [ ] Team player CRUD (`POST /teams/:id/players`, `DELETE /teams/:id/players/:playerId`).
- [ ] Roster rules / duplicate-prevention enforcement.
- [ ] `DELETE /teams/:id` — cascade/constraint behavior on team players.

---

## Events (`src/events/events.e2e.spec.ts`)

> Covers the `EventSyncGroup` strategies (NFL/Golf/World Cup) via `GET /event-groups/:sportLeague` (each GET re-syncs, so Sleeper/FIFA/FanDuel/ESPN upstreams are re-mocked per request).

### ✅ Covered
- [x] `GET /event-groups/NFL` — happy path: syncs NFL from Sleeper (state + scores mocked), persists min/max game dates from `batch_scores` as `event.startDate`/`endDate`.
- [x] `GET /event-groups/NFL` — idempotency: second call does not duplicate event groups/events.
- [x] `GET /event-groups/NFL` — multiple weeks in the same season merge into one event group.
- [x] `GET /event-groups/NFL` — empty scores (no games scheduled) → no event group created.
- [x] `GET /event-groups/NFL/with-dates` — future-week dates → `status: 'PENDING'`.
- [x] `GET /event-groups/GOLF` — sync from FanDuel (post events) + ESPN (start/end dates), verify merged event group.
- [x] `GET /event-groups/WORLDCUP` — sync events from FIFA (start/end dates from fixture).
- [x] `GET /event-groups/NBA` — unknown `sportLeague` → 500 (strategy registry miss).

### ⏭️ Remaining / Next Up
- [ ] Verify `status` (PENDING/PLAYING/FINISHED) transitions across date ranges (only PENDING for future dates covered so far).
- [ ] Upstream errors (Sleeper/FIFA timeouts or 4xx/5xx) propagate cleanly.

---

## FIFA (`src/external-providers/fifa/fifa.e2e.spec.ts`)

### ✅ Covered
- [x] `GET /fifa/rounds` — returns rounds from upstream API (mocked).
- [x] `GET /fifa/players` — returns players from upstream API (mocked).
- [x] `GET /fifa/squads` — returns squads from upstream API (mocked).
- [x] `GET /fifa/rounds/:roundId/projections` — returns merged player+squad+match projections for a round (mocked).
- [x] `GET /fifa/rounds/:roundId/projections` — returns empty array for unknown round ID.

### ⏭️ Remaining / Next Up
- [ ] Upstream errors: propagate 4xx/5xx with clear error messages.
- [ ] Timeouts / retry behavior (if implemented).
- [ ] Caching semantics (if any): warm cache, subsequent reads from cache; invalidation policy.

---

## Cross-cutting / Infrastructure
- [ ] **Error contract**: Ensure all endpoints return consistent error payloads for 400/404 (assert `{ statusCode, message }`).
- [ ] **Typia runtime validation**: Confirm `@TypedRoute` + `typia` validation active for all DTOs.
- [ ] **SDK stability**: Regenerate functional SDK in CI and keep tests aligned (`npm run sdk`). NOTE: `npm run sdk` currently fails on `FanduelController.getGolfEventsEnriched()` (implicit return type) — while unblocked, `functional/events` and `getLeaguePositions` are maintained by hand in nestia's generated style.
- [ ] **DB reset hook**: Maintain `__reset__` test hook; global afterEach prevents state leakage.
- [ ] **Auth/permissions (future)**: Add E2E once auth lands—401/403 flows and role-based restrictions.
- [ ] **Pagination**: Standard paging tests (first/next/last pages; boundary conditions) where lists support it.