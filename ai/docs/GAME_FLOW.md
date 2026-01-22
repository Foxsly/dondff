# Game Flow

This document formalizes the backend-driven Deal-or-No-Deal-style game loop for DONDFF.

## Goals and invariants

- Game integrity: the client must never be able to infer which player is in which case before reveal.
- All randomness and fairness-critical logic lives on the backend.
- The frontend is a rendering layer: it requests state, submits player choices, and displays results.
- The backend must be deterministic for a given game state (same inputs -> same outputs), while keeping hidden mappings server-side.

## Key domain entities

The exact schemas live in code; this document describes their responsibilities.

- `team`
  - Represents a user’s play session context for a league/season/week/position.
- `teamEntry`
  - One “round” of the game for a specific `teamId` + `position`.
  - Stores selection state (`selectedBox`), resets, and terminal status.
- `teamEntryAudit`
  - The authoritative per-box history for a given entry and reset.
  - Stores hidden player assignment and the visible box state (`available`, `selected`, `eliminated`, `revealed`).
- `teamEntryOffer`
  - Records offers made and accepted/declined actions.
- `teamEntryEvent`
  - Append-only event stream for state transitions (selection, elimination, offer actions, reveal, finalize).

## Game state model

### Entry status

A `teamEntry` progresses through these high-level statuses:

- `pending`
  - Entry exists but no case has been selected.
- `inProgress`
  - Case selected; eliminations/offers underway.
- `completed`
  - Terminal (accepted offer or finalized keep/swap reveal).
- `invalid`
  - Entry is not playable (e.g., inconsistent league/week context) and must be regenerated.

### Box status

A `teamEntryAudit` row tracks the current status for each box:

- `available`
  - Still in play.
- `selected`
  - The user’s chosen box (held until reveal).
- `eliminated`
  - Removed from consideration and may be revealed depending on stage.
- `revealed`
  - Fully revealed to the user (player mapping is safe to show).

### Offer action

Offer decisions are expressed as:

- `ACCEPT`
- `DECLINE`
- `KEEP`
- `SWAP`

## API contracts

All endpoints below live in `teams.controller.ts`.

### 1) Create or start a team session

**POST** `/teams`

Purpose:
- Creates a `team` and initializes one or more `teamEntry` records.
- Generates cases by populating `teamEntryAudit` (and initial events), using Sleeper data on the server.

Notes:
- The response must not leak player-to-case mapping.
- Consider returning:
  - `teamId`
  - basic metadata (leagueId, season, week, owner)
  - a minimal “display player list” for UI (safe: projections/injury/team status only)

Request (conceptual):
- `leagueId`, `userId`, `season`, `week`, optional `position` or “positions to initialize”

Response (conceptual):
- `teamId`
- `players[]` (safe display list)

---

### 2) List cases for an entry

**GET** `/teams/{teamId}/cases?position={POSITION}`

Purpose:
- Returns the cases to render for the current entry state.

Requirements:
- Must return box numbers and visible statuses.
- Must not return the hidden mapping of players inside cases.

Response (conceptual):
- `teamEntryId`
- `position`
- `resetCount`
- `selectedBox` (nullable)
- `cases[]`:
  - `boxNumber`
  - `boxStatus` (`available | selected | eliminated | revealed`)
  - optionally safe display fields for revealed boxes only

---

### 3) Select a case

**POST** `/teams/{teamId}/cases`

Purpose:
- Locks the selected case for the entry.
- Advances the game by eliminating a first set of boxes and producing the initial offer.

Request (conceptual):
- `position`
- `action`: `selectCase`
- `boxNumber`

Validation:
- Reject if an entry already has a selected case.
- Reject if entry status is terminal.

Response (conceptual):
- `teamEntryId`
- `selectedBox`
- `eliminated[]`: list of `{ boxNumber }` (player reveal may be partial depending on stage)
- `offer`:
  - `value`
  - optional `offerId`

---

### 4) Reset cases (one-time before selection)

**POST** `/teams/{teamId}/cases/reset`

Purpose:
- Allows the user to regenerate the case set once, only if no case is selected.

Request (conceptual):
- `position`

Validation:
- Reject if reset limit reached.
- Reject if a case is already selected.

Response (conceptual):
- new safe `players[]` list
- updated `resetCount`

---

### 5) Get current offer

**GET** `/teams/{teamId}/offers?position={POSITION}`

Purpose:
- Fetch the current offer for the entry based on remaining boxes.

Response (conceptual):
- `teamEntryId`
- `position`
- `offer`:
  - `value`
  - `stage` (optional)
  - `remainingBoxCount`

---

### 6) Advance offer state (accept/decline/keep/swap)

**POST** `/teams/{teamId}/offers`

Purpose:
- Applies an offer action.
- If `DECLINE`, eliminates additional boxes and returns a new offer.
- If `ACCEPT`, reveals all boxes and marks entry complete.
- If `KEEP`/`SWAP`, finalizes the endgame and marks entry complete.

Request (conceptual):
- `position`
- `action`: `ACCEPT | DECLINE | KEEP | SWAP`

Response (conceptual):
- `teamEntryId`
- `actionApplied`
- `eliminated[]` (if any)
- `offer` (if continuing)
- `reveal`:
  - `cases[]` with revealed player mappings if terminal

## State transitions

This section shows the expected transitions. The backend should record each transition in `teamEntryEvent`.

### Start / initialize

- `POST /teams`
  - Creates `team`
  - Creates `teamEntry` with `status=pending`, `resetCount=0`, `selectedBox=null`
  - Creates `teamEntryAudit` rows for each box (resetNumber = resetCount)

### Reset

- `POST /teams/{teamId}/cases/reset`
  - Preconditions:
    - `selectedBox` is null
    - `resetCount < resetLimit`
  - Actions:
    - Increment `resetCount`
    - Generate a new set of audits (new resetNumber)

### Select

- `POST /teams/{teamId}/cases` (selectCase)
  - Preconditions:
    - `selectedBox` is null
    - entry status is not terminal
  - Actions:
    - Update `teamEntry.selectedBox`
    - Update audit status for selected box
    - Eliminate initial boxes
    - Create initial offer record
    - Move entry to `inProgress`

### Decline

- `POST /teams/{teamId}/offers` (DECLINE)
  - Preconditions:
    - entry is `inProgress`
    - offer is active
  - Actions:
    - Eliminate next boxes
    - Create next offer record

### Accept

- `POST /teams/{teamId}/offers` (ACCEPT)
  - Preconditions:
    - entry is `inProgress`
  - Actions:
    - Reveal all boxes
    - Persist accepted offer
    - Set entry to `completed`

### Keep / Swap (endgame)

- `POST /teams/{teamId}/offers` (KEEP | SWAP)
  - Preconditions:
    - entry is `inProgress`
    - remaining box count == 2
  - Actions:
    - If `SWAP`, swap the “held” selection with the other remaining box
    - Reveal final state
    - Set entry to `completed`

## Data visibility rules

- Before terminal reveal:
  - API responses must not include player-to-case mapping for non-revealed boxes.
- During play:
  - Eliminated boxes may be revealed only when it is safe and aligned with game stage.
- After terminal:
  - All boxes may be revealed.

## Error contract

Endpoints should return consistent error responses that match existing backend conventions.

Examples (conceptual):
- `409 Conflict` when selecting a case that is already selected
- `400 Bad Request` for invalid position/action inputs
- `404 Not Found` for missing `teamId` or entry

## E2E expectations

When implementing or changing endpoints, add E2E coverage:

- Happy-path tests:
  - create team -> get cases -> select case -> decline -> accept -> verify reveal
- Negative-path tests:
  - select twice returns conflict
  - reset after selection returns error
  - offer action when entry not in progress returns error

