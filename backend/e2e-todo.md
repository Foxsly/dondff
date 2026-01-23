# E2E Test TODOs

This document tracks remaining and current **end-to-end (E2E)** coverage across backend modules. Items are grouped by module and marked complete `[x]` when covered by existing specs. Use these as checklists when expanding `*.e2e.spec.ts` suites.

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
- [x] `POST /leagues/:id/settings` — create settings v1 (fields + ISO timestamps).
- [x] `POST /leagues/:id/settings` — create settings v2 and verify latest reflects v2.
- [x] `GET /leagues/:id/settings/latest` — returns latest (v2) settings.
- [x] `GET /leagues/settings/:settingsId` — returns settings by id (v1).
- [x] Settings **negative cases** — latest w/ none → 404; unknown by-id → 404; invalid DTO (empty positions) → 400.
- [x] Settings **validation edges** — invalid `scoringType`; duplicate positions; negative pool sizes → 400.
- [x] Settings **cross-league safety** — path `leagueId` trusted over body; no leakage between leagues.
- [x] Settings **burst writes** — latest remains the truly newest version.

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

## Sleeper (`src/sleeper/sleeper.e2e.spec.ts`)

> External integration should be deterministic — consider mocks/fixtures.

### Desired Coverage
- [ ] Happy path: fetch league/players from Sleeper and map to internal DTOs.
- [ ] Upstream errors: propagate 4xx/5xx with clear error messages.
- [ ] Timeouts / retry behavior (if implemented).
- [ ] Caching semantics (if any): warm cache, subsequent reads from cache; invalidation policy.

---

## Teams (`src/teams/teams.e2e.spec.ts`) — future when SDK endpoints exist

### Desired Coverage
- [ ] `POST /teams` — create team for a league (validate league/user constraints).
- [ ] `GET /teams/:id` — returns team (and players if embedded).
- [ ] `PATCH /teams/:id` — update team metadata.
- [ ] `DELETE /teams/:id` — cascade/constraints on team players.
- [ ] `POST /teams/:id/players` — add multiple players; prevent duplicates; enforce roster rules.
- [ ] `DELETE /teams/:id/players/:playerId` — remove player; second removal → 404.

---

## Cross-cutting / Infrastructure
- [ ] **Error contract**: Ensure all endpoints return consistent error payloads for 400/404 (assert `{ statusCode, message }`).
- [ ] **Typia runtime validation**: Confirm `@TypedRoute` + `typia` validation active for all DTOs.
- [ ] **SDK stability**: Regenerate functional SDK in CI and keep tests aligned (`npm run sdk`).
- [ ] **DB reset hook**: Maintain `__reset__` test hook; global afterEach prevents state leakage.
- [ ] **Auth/permissions (future)**: Add E2E once auth lands—401/403 flows and role-based restrictions.
- [ ] **Pagination**: Standard paging tests (first/next/last pages; boundary conditions) where lists support it.