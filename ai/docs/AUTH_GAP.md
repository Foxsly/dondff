# Authentication and Authorization — current state

**Status:** known gap, not scheduled. Documented 2026-08-15 during the frontend UI overhaul.

This is a write-up, not a plan of record. Nothing here has been implemented.

## Summary

The API has **no authentication**. There is no guard, no middleware, no session,
no token, and no password storage. Requests carry no identity, so the server
cannot tell who is calling — which means it also cannot enforce *any*
authorization rule.

Every endpoint is effectively public to anyone who can reach the server.

## What "login" currently does

There is no login. `frontend/src/api/auth.ts`:

- **Register** — `POST /users` with `{ name, email, password }`. The backend
  ignores `password`; there is no column for it.
- **Login** — `GET /users` (the entire user list), find the first record whose
  email matches, and write it to `localStorage` under `authUser`.
- **Current user** — read that `localStorage` key.

So "being signed in" means having a JSON blob in your own browser storage. It
is self-asserted, never checked, and editable from the console. `GET /users`
also exposes every user's id, name and email to any unauthenticated caller.

`ProtectedRoute` and the `AuthContext` gate the UI on this value. They keep the
app coherent for an honest user; they are not access control.

## Where it bites

The league admin surfaces added in the UI overhaul are the sharpest example.
The UI shows these controls only to a member whose `role === 'admin'`
(`frontend/src/components/league/SettingsTab.tsx`,
`frontend/src/components/league/MembersTab.tsx`), but the endpoints behind them
check nothing:

| Endpoint | Effect | Who can call it today |
|---|---|---|
| `PATCH /leagues/:id` | Rename a league | Anyone |
| `DELETE /leagues/:id` | Delete a league, its members and every entry | Anyone |
| `PUT /leagues/:id/users/:userId` | Change any member's role | Anyone |
| `DELETE /leagues/:id/users/:userId` | Remove any member | Anyone |
| `PUT /leagues/:id/users` | Add themselves to any league | Anyone |

`DELETE /leagues/:id` cascades to `league_user`, `team`, and through `team` to
entries, offers and audit rows. One unauthenticated request destroys a league's
entire history.

The same applies outside the admin screens — `POST /teams`, the case-selection
and offer endpoints all accept a `userId` from the caller and act on it, so one
user can play another user's game.

## Two separate problems

It is worth keeping these apart, because they have different fixes and
different urgency.

### 1. No caller identity (authentication)

The blocker. Nothing can be enforced until the server knows who is asking.
Requires, roughly:

- A migration adding `dond_user.password_hash` (append-only, per project rules)
- A hashing dependency (argon2 or bcrypt)
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- A session cookie or JWT, and a Nest `AuthGuard` applied globally with an
  explicit opt-out for public routes
- Frontend: a real login flow, and `credentials: 'include'` already set in
  `api/client.ts` so cookies would carry
- A decision about the existing users, who have no password: force a reset, or
  set one on next login

Also worth folding in: `GET /users` should not be public, and login should stop
being "fetch all users and filter client-side".

### 2. Invariants enforced only in the browser (integrity)

Independent of auth, and fixable without it. These rules currently live only in
React, so any direct API call bypasses them:

- **A league must keep at least one admin.** The UI refuses to demote the last
  one (`MembersTab.tsx`); the server will happily leave a league with none, and
  there is no in-app route back from that state.
- **You cannot remove yourself.** UI-only; the server allows it.

Moving these into `LeaguesService` would make them true regardless of client,
and they are ordinary business rules of the kind the service layer already
owns. This is data integrity, not security — it protects against a buggy or
outdated client, not a hostile one.

## Recommended order

1. Authentication (§1) — everything else depends on it.
2. Role checks on the league endpoints, once there is a caller to check.
3. The invariants (§2) — could be done at any point, including before §1, since
   they need no identity.

## Deliberately not done

A `X-User-Id`-style header was considered as an interim step and rejected. It
would let the authorization code be written and would make the endpoints return
403, but the header is client-supplied and trivially forged. The result reads as
access control in review while providing none, which is worse than the current
state being plainly visible.
