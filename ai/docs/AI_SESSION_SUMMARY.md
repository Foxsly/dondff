# AI Session Summary – Backend, Game Flow, Infra, Frontend

## Backend Architecture

### Core Stack
- **NestJS** with:
  - `@nestia/core` + `typia` for typed routes and runtime validation
  - **Kysely** as the database abstraction
- Supports **Postgres (default / prod)** and **SQLite (exception / local / test)**
- Strong preference for:
  - Domain-driven modules
  - Type-safe DTOs derived from entities
  - Append-only migrations
  - E2E tests validating contracts

### Database Design
- Introduced **game audit entities**:
  - `teamEntry`
  - `teamEntryAudit`
  - `teamEntryOffer`
  - `teamEntryEvent`
- All table names and columns moved to **camelCase**
- Used `Generated<T>` for `createdAt` / `updatedAt` fields to avoid optional-field complexity in inserts
- SQLite caveat: `ON DELETE CASCADE` requires `PRAGMA foreign_keys = ON`
- Postgres issues around `json_object` required **engine-aware query logic**

### Repository Patterns
- One repository per aggregate (`teams.repository.ts`, `teams-entry.repository.ts`)
- Repositories:
  - Return concrete domain types
  - Use local variables before return for:
    - Debugging
    - Type assertions
    - Future instrumentation
- Avoided parameter “bags” (`args: {}`) in favor of explicit parameters

### Service Layer
- `TeamsService` owns orchestration:
  - Team creation
  - Case generation
  - Reset logic
  - Offer calculation
- Business logic intentionally moved **server-side** to prevent client tampering
- Heavy use of:
  - Sleeper projections
  - Deterministic but hidden player–case mapping

---

## Game Flow Decisions

### Security / Integrity Principles
- **Client must never know which player is in which case**
- All randomization, elimination, and offer logic lives on the server
- Frontend only receives:
  - Disassociated case metadata
  - Elimination results
  - Offers

### Finalized Game Flow
1. User clicks **Play Game**
2. `POST /teams`
   - Creates team
   - Generates cases for each position
   - Populates `teamEntry` + `teamEntryAudit`
3. `GET /teams/{teamId}/cases?position=`
   - Returns **disassociated cases**
4. User selects a case
5. `POST /teams/{teamId}/cases`
   - Locks selected case
   - Eliminates cases
   - Returns initial offer
6. User accepts or declines offer
   - `POST /teams/{teamId}/offers`
   - Server:
     - Eliminates more cases
     - Recalculates offer
7. Endgame:
   - KEEP / SWAP decision when two cases remain
8. Optional reset (once):
   - `POST /teams/{teamId}/cases/reset`

### Math & Offer Logic
- Offer value calculated using **RMS (root mean square)** of remaining cases
- Closest-match offer selected via absolute-difference comparison
- Prior offers excluded from future consideration

---

## Docker / Infrastructure Setup

### Container Strategy
- **Distroless + rootless** production images
- Multi-stage builds:
  - Builder (full toolchain)
  - Prod (runtime only)
- `npm ci --omit=dev` in prod stage
- `prepare` scripts disabled in prod installs to avoid `ts-patch` issues

### Image Size Wins
- Backend runtime image: **~66 MB**
- Frontend runtime image: **~53 MB**
- Builders intentionally large and excluded from deployment

### docker-compose
- Postgres as default DB
- SQLite supported for tests/local
- Environment config:
  - `.env` file
  - Shared values for `POSTGRES_PASSWORD` and `DATABASE_URL`
- Learned:
  - `docker compose down -v` removes volumes
  - Individual volumes must be explicitly named to selectively delete
  - `COMPOSE_PROJECT_NAME` behavior changes when using a parent `include` file

### Deployment Model
- **Build once, deploy everywhere**
- Images built locally and transferred to server
- No public registry required
- Environment-specific config injected at runtime

---

## Frontend Migration Notes

### Backend Integration
- Migrated from Firebase → backend APIs
- Auth:
  - Temporary email-based lookup
  - No passwords enforced yet
- User context added via `AuthContext`
- Navbar now reacts to login/logout state

### API Usage Patterns
- Avoid repeated calls:
  - Cache Sleeper projections
  - Compute once per render cycle
- Fixed excessive API calls caused by:
  - Missing `useEffect` dependencies
  - Unstable function references (fixed via `useCallback`)

### Game UI Changes
- Team existence checked once on mount:
  - Create if missing
- Entries & results:
  - Projections used **before** current week
  - Calculated scores used **after** week passes
- Async logic moved into `useEffect`
- ESLint issues resolved by proper hook dependency management

### Styling Cleanup
- Extracted repeated inline styles into `App.css`
- Created reusable classes:
  - `.btn-signin`
  - `.btn-logout`
  - `.navbar-link-text`

---

## External Links

- **DOND Backend Repository (NestJS backend)**  
  https://github.com/Foxsly/dondff/tree/nestjs-backend

- **Base (Design system / color tooling reference)**  
  https://base.tint.space

### Core Technologies & References

- **NestJS (Node.js framework)**  
  https://docs.nestjs.com

- **@nestia/core (Typed routes for NestJS)**  
  https://github.com/samchon/nestia

- **typia (Runtime validation & type inference)**  
  https://github.com/samchon/typia

- **Kysely (Type-safe SQL query builder)**  
  https://kysely.dev

- **Docker (Containers & build tooling)**  
  https://docs.docker.com

- **Distroless Images (Minimal production containers)**  
  https://github.com/11notes/RTFM

- **PostgreSQL (Primary production database)**  
  https://www.postgresql.org/docs/

- **SQLite (Local/test database engine)**  
  https://www.sqlite.org/docs.html