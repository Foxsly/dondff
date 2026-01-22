# Diagrams

This file contains Mermaid diagrams for the DONDFF backend and game flow.

## Backend layering

```mermaid
sequenceDiagram
  autonumber
  participant UI
  participant Controller
  participant Service
  participant Repo as Repository
  participant DB
  participant Sleeper as External API

  Note over UI,Sleeper: Controllers expose typed HTTP APIs via @TypedRoute.
  Note over Controller,Repo: Controllers call Services; Services call Repositories.
  Note over Repo,DB: Repositories are the only layer that executes SQL.

  UI->>Controller: HTTP request
  Controller->>Service: validate + delegate
  Service->>Sleeper: fetch external data (if needed)
  Service->>Repo: persistence / retrieval
  Repo->>DB: SQL via Kysely
  DB-->>Repo: rows
  Repo-->>Service: domain objects
  Service-->>Controller: response model (safe)
  Controller-->>UI: HTTP response
```

## Game state transitions

```mermaid
stateDiagram-v2
  [*] --> pending: entry created
  pending --> pending: reset (allowed)
  pending --> inProgress: selectCase
  inProgress --> inProgress: decline (eliminate + new offer)
  inProgress --> completed: accept (reveal all)
  inProgress --> completed: keep/swap (endgame)
  completed --> [*]

  note right of pending
    No selected box.
    Reset allowed (limited).
  end note

  note right of inProgress
    Selected box locked.
    Offers + eliminations.
    No reset.
  end note

  note right of completed
    Terminal.
    All boxes may be revealed.
  end note
```

## POST /teams – create team + initialize cases

```mermaid
sequenceDiagram
  participant UI
  participant TeamsController
  participant TeamsService
  participant PlayerStatsService
  participant TeamsRepository
  participant TeamsEntryRepository
  participant DB

  Note over UI,DB: Backend owns randomness and case/player mapping.
  Note over UI,DB: Response must not leak unrevealed mappings.

  UI->>TeamsController: POST /teams
  TeamsController->>TeamsService: createTeam(request)
  TeamsService->>TeamsRepository: createTeamRow(...)
  TeamsRepository->>DB: INSERT team
  DB-->>TeamsRepository: team row
  TeamsRepository-->>TeamsService: team

  TeamsService->>PlayerStatsService: getPlayers + projections (server-side)
  PlayerStatsService-->>TeamsService: player pool

  TeamsService->>TeamsEntryRepository: createEntry + audits (cases)
  TeamsEntryRepository->>DB: INSERT teamEntry
  TeamsEntryRepository->>DB: INSERT teamEntryAudit (10 boxes)
  TeamsEntryRepository-->>TeamsService: entry metadata

  TeamsService-->>TeamsController: teamId + safe players list
  TeamsController-->>UI: 201 Created
```

## GET /teams/{teamId}/cases – list cases without mapping

```mermaid
sequenceDiagram
  participant UI
  participant TeamsController
  participant TeamsService
  participant TeamsEntryRepository
  participant DB

  Note over UI,DB: Must not return player-to-case mapping for unrevealed boxes.

  UI->>TeamsController: GET /teams/{teamId}/cases?position=POS
  TeamsController->>TeamsService: getCases(teamId, position)
  TeamsService->>TeamsEntryRepository: findEntryByTeamAndPosition(...)
  TeamsEntryRepository->>DB: SELECT teamEntry
  DB-->>TeamsEntryRepository: teamEntry row
  TeamsEntryRepository-->>TeamsService: teamEntry

  TeamsService->>TeamsEntryRepository: findAuditsForEntry(teamEntryId, resetCount)
  TeamsEntryRepository->>DB: SELECT teamEntryAudit
  DB-->>TeamsEntryRepository: audits
  TeamsEntryRepository-->>TeamsService: audits

  TeamsService-->>TeamsController: cases[] (status-only + revealed-only details)
  TeamsController-->>UI: 200 OK
```

## POST /teams/{teamId}/cases – selectCase + initial eliminations + offer

```mermaid
sequenceDiagram
  participant UI
  participant TeamsController
  participant TeamsService
  participant TeamsEntryRepository
  participant TeamsOfferRepository
  participant DB

  Note over UI,DB: Selecting a case is a state transition; record audit/event.

  UI->>TeamsController: POST /teams/{teamId}/cases {position, action:selectCase, boxNumber}
  TeamsController->>TeamsService: selectCase(teamId, position, boxNumber)
  TeamsService->>TeamsEntryRepository: getEntryForUpdate(...)
  TeamsEntryRepository->>DB: SELECT teamEntry
  DB-->>TeamsEntryRepository: entry
  TeamsEntryRepository-->>TeamsService: entry

  alt selectedBox already set
    TeamsService-->>TeamsController: 409 Conflict
    TeamsController-->>UI: error
  else ok
    TeamsService->>TeamsEntryRepository: setSelectedBox(entryId, boxNumber)
    TeamsEntryRepository->>DB: UPDATE teamEntry
    TeamsService->>TeamsEntryRepository: eliminateInitialBoxes(entryId)
    TeamsEntryRepository->>DB: UPDATE teamEntryAudit (mark eliminated)
    TeamsService->>TeamsOfferRepository: createInitialOffer(entryId)
    TeamsOfferRepository->>DB: INSERT teamEntryOffer
    TeamsOfferRepository-->>TeamsService: offer
    TeamsService-->>TeamsController: eliminated[] + offer
    TeamsController-->>UI: 200 OK
  end
```

## POST /teams/{teamId}/cases/reset – reset before selection

```mermaid
sequenceDiagram
  participant UI
  participant TeamsController
  participant TeamsService
  participant TeamsEntryRepository
  participant PlayerStatsService
  participant DB

  Note over UI,DB: Reset allowed only before selection and within reset limit.

  UI->>TeamsController: POST /teams/{teamId}/cases/reset {position}
  TeamsController->>TeamsService: resetCases(teamId, position)
  TeamsService->>TeamsEntryRepository: findEntryByTeamAndPosition(...)
  TeamsEntryRepository->>DB: SELECT teamEntry
  DB-->>TeamsEntryRepository: entry
  TeamsEntryRepository-->>TeamsService: entry

  alt selectedBox set OR reset limit reached
    TeamsService-->>TeamsController: 409/400 error
    TeamsController-->>UI: error
  else ok
    TeamsService->>PlayerStatsService: getPlayers + projections (new pool)
    PlayerStatsService-->>TeamsService: players
    TeamsService->>TeamsEntryRepository: incrementResetCount(entryId)
    TeamsEntryRepository->>DB: UPDATE teamEntry
    TeamsService->>TeamsEntryRepository: createNewAudits(entryId, resetCount)
    TeamsEntryRepository->>DB: INSERT teamEntryAudit (new resetNumber)
    TeamsService-->>TeamsController: safe players list
    TeamsController-->>UI: 200 OK
  end
```

## GET /teams/{teamId}/offers – current offer

```mermaid
sequenceDiagram
  participant UI
  participant TeamsController
  participant TeamsService
  participant TeamsEntryRepository
  participant TeamsOfferRepository
  participant DB

  UI->>TeamsController: GET /teams/{teamId}/offers?position=POS
  TeamsController->>TeamsService: getCurrentOffer(teamId, position)
  TeamsService->>TeamsEntryRepository: findEntryByTeamAndPosition(...)
  TeamsEntryRepository->>DB: SELECT teamEntry
  DB-->>TeamsEntryRepository: entry
  TeamsEntryRepository-->>TeamsService: entry

  TeamsService->>TeamsOfferRepository: findCurrentOffer(entryId)
  TeamsOfferRepository->>DB: SELECT teamEntryOffer
  DB-->>TeamsOfferRepository: offer
  TeamsOfferRepository-->>TeamsService: offer

  TeamsService-->>TeamsController: offer
  TeamsController-->>UI: 200 OK
```

## POST /teams/{teamId}/offers – accept/decline/keep/swap

```mermaid
sequenceDiagram
  participant UI
  participant TeamsController
  participant TeamsService
  participant TeamsEntryRepository
  participant TeamsOfferRepository
  participant DB

  Note over UI,DB: Offer actions drive eliminations and terminal reveal.

  UI->>TeamsController: POST /teams/{teamId}/offers {position, action}
  TeamsController->>TeamsService: applyOfferAction(teamId, position, action)
  TeamsService->>TeamsEntryRepository: findEntryByTeamAndPosition(...)
  TeamsEntryRepository->>DB: SELECT teamEntry
  DB-->>TeamsEntryRepository: entry
  TeamsEntryRepository-->>TeamsService: entry

  alt action == DECLINE
    TeamsService->>TeamsEntryRepository: eliminateNextBoxes(entryId)
    TeamsEntryRepository->>DB: UPDATE teamEntryAudit
    TeamsService->>TeamsOfferRepository: createNextOffer(entryId)
    TeamsOfferRepository->>DB: INSERT teamEntryOffer
    TeamsOfferRepository-->>TeamsService: offer
    TeamsService-->>TeamsController: eliminated[] + new offer
    TeamsController-->>UI: 200 OK
  else action == ACCEPT
    TeamsService->>TeamsEntryRepository: revealAll(entryId)
    TeamsEntryRepository->>DB: UPDATE teamEntryAudit (revealed)
    TeamsService->>TeamsEntryRepository: markCompleted(entryId)
    TeamsEntryRepository->>DB: UPDATE teamEntry (completed)
    TeamsService-->>TeamsController: reveal payload (all cases)
    TeamsController-->>UI: 200 OK
  else action == KEEP or SWAP
    TeamsService->>TeamsEntryRepository: finalizeEndgame(entryId, action)
    TeamsEntryRepository->>DB: UPDATE audits + entry (completed)
    TeamsService-->>TeamsController: reveal payload (final)
    TeamsController-->>UI: 200 OK
  end
```

## Backend startup + migrations (distroless-friendly)

```mermaid
sequenceDiagram
  participant Orchestrator as Deploy Script / Operator
  participant Compose as Docker Compose
  participant Backend as dondff-backend
  participant DB as Postgres

  Note over Backend,DB: Backend must not depend on a shell inside the runtime image.
  Note over Backend,DB: Migrations must resolve migration paths without src/dist coupling.

  Orchestrator->>Compose: docker compose up -d
  Compose->>DB: start postgres container
  DB-->>Compose: healthy
  Compose->>Backend: start backend container
  Backend->>DB: connect using DATABASE_URL
  DB-->>Backend: connection ok

  alt migrations-on-start enabled
    Backend->>DB: run Kysely migrations
    DB-->>Backend: migration results
  else migrations executed separately
    Note over Orchestrator,Backend: Run migrations via a dedicated runner image/stage that contains node tooling.
  end

  Backend-->>Compose: healthy (via /health)
```

## Docker Compose topology

```mermaid
flowchart LR
  subgraph web[web network]
    Caddy[Caddy / Reverse Proxy]
    FE[dondff-frontend]
  end

  subgraph internal[internal network]
    BE[dondff-backend]
    PG[(dondff-postgres)]
  end

  Caddy -->|https://dondff.foxsly.org| FE
  Caddy -->|https://dondff.foxsly.org/api| BE

  FE -->|HTTP /api/*| Caddy
  BE -->|DATABASE_URL| PG

  Note1["Frontend never talks to backend by service name in the browser (e.g. backend:3001). Use domain-relative /api via proxy."]
  FE -.-> Note1
```

## Frontend runtime configuration injection

```mermaid
sequenceDiagram
  participant Browser
  participant Frontend as dondff-frontend
  participant Proxy as Caddy
  participant Backend as dondff-backend

  Note over Browser,Backend: API base URL must be runtime-configurable; avoid hardcoding.

  Browser->>Frontend: GET /
  Frontend-->>Browser: index.html

  Browser->>Frontend: GET /runtime-env.js
  Frontend-->>Browser: window.RUNTIME_CONFIG = { API_BASE_URL: "/api" }

  Browser->>Proxy: GET /api/health
  Proxy->>Backend: forward /health
  Backend-->>Proxy: 200 OK
  Proxy-->>Browser: 200 OK

  Note over Browser,Proxy: Browser uses API base '/api' (domain-relative).
```

## Master compose include (multi-stack) – project/volume boundaries

```mermaid
sequenceDiagram
  participant Operator
  participant Master as ~/docker/docker-compose.yaml
  participant Stack as dondff/docker-compose.yaml
  participant Docker

  Note over Operator,Docker: When using a master compose with include, env/.env scope is based on where compose is executed.
  Note over Operator,Docker: Prefer explicit project name (-p dondff) or ensure env is loaded at the master level.

  Operator->>Docker: docker compose up -d (run from ~/docker)
  Docker->>Master: load includes
  Master->>Stack: include dondff stack
  Docker-->>Operator: containers/volumes created under one project namespace

  Note over Operator,Docker: Volume confusion happens when project naming changes; inspect mounts to confirm which volume is in use.
```
