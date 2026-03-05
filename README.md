# Deal or No Deal Fantasy Football

A fantasy mini-game based on the TV show. Players draft their lineup by playing a Deal or No Deal-style game using Fantasy Football projections. The highest-scoring lineup at the end of the week wins.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (TypeScript), Tailwind CSS |
| Backend | NestJS (TypeScript), Kysely ORM |
| Database | PostgreSQL (Docker) |

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

### 1. Environment setup

The repo ships with a `.env.example` at the root. Copy it to create your local `.env`:

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development — no changes needed unless you want different Postgres credentials.

---

### 2. Start the database

From the **project root**, start the Postgres container:

```bash
docker compose up dondff-postgres -d
```

Verify it's running:

```bash
docker compose ps
```

---

### 3. Run database migrations

From the **`backend/`** directory:

```bash
cd backend
npm install
npm run migrate
```

This applies all pending migrations to the local Postgres database. Re-run this any time new migration files are added.

---

### 4. Start the backend

Still in **`backend/`**:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3001`. It watches for file changes and restarts automatically.

---

### 5. Start the frontend

In a new terminal, from the **`frontend/`** directory:

```bash
cd frontend
npm install
npm start
```

The app will open at `http://localhost:3000` and proxies API requests to `localhost:3001`.

---

### Quick-start summary

```bash
# Terminal 1 — database
docker compose up dondff-postgres -d

# Terminal 2 — backend (first time: npm install && npm run migrate)
cd backend && npm run start:dev

# Terminal 3 — frontend (first time: npm install)
cd frontend && npm start
```

---

### Stopping the database

```bash
docker compose down              # stop containers, keep data
docker compose down -v           # stop containers and delete all data
```

---

## Database migrations

Migration files live in `backend/src/infrastructure/database/migrations/`. Each file exports an `up` and `down` function.

```bash
npm run migrate            # apply all pending migrations
npm run migrate:status     # list applied / pending migrations
npm run migrate:down       # roll back the most recent migration
```

New migration files should follow the naming convention:

```
0007_short_description.ts
```

---

## Deployment

The app is deployed via Docker images built for linux/amd64. To build and export images locally (Apple Silicon):

```bash
docker buildx create --name dondff-builder --use
docker buildx inspect --bootstrap
./scripts/build-and-export-images.sh
```

See the server-side deploy scripts in the `scripts/` directory for the full deployment flow.
