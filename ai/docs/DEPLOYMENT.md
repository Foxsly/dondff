# Deployment

This document describes how to deploy DONDFF on a server using Docker Compose, following a **build once, deploy everywhere** model.

## Overview

Deployment uses:

- Prebuilt Docker images for:
  - `backend` (NestJS API)
  - `frontend` (static client served by a minimal runtime)
- A `docker-compose.yaml` that wires:
  - Postgres (default)
  - Backend
  - Frontend
- Runtime configuration injected via environment variables and/or `.env` files.

The server should only need Docker + Docker Compose.

## Prerequisites

On the server:

- Docker Engine installed
- Docker Compose v2 available (`docker compose`)
- A directory layout for compose stacks (example below)

On your local machine:

- Ability to build images locally
- SSH access to the server

## Recommended server directory layout

Example:

```
~/docker/
  docker-compose.yaml              # optional "master" compose using include
  dondff/
    docker-compose.yaml            # dondff stack compose
    .env                           # dondff runtime config
    images/                        # optional: exported image tarballs
```

If you use a single “master” compose that includes sub-stacks, keep `dondff/.env` next to `dondff/docker-compose.yaml`.

## Runtime configuration (.env)

Use a `.env` file to keep secrets and per-environment values out of source control.

Typical variables:

- `NODE_ENV=production`
- `PORT=3001`
- `DB_ENGINE=postgres`
- `POSTGRES_USER=...`
- `POSTGRES_PASSWORD=...`
- `POSTGRES_DB=...`
- `DATABASE_URL=postgres://...`
- `API_BASE_URL=https://dondff.foxsly.org/api` (frontend)

### One source of truth for passwords

Prefer defining the password once:

- `POSTGRES_PASSWORD=...`

and constructing:

- `DATABASE_URL=postgres://<user>:${POSTGRES_PASSWORD}@<host>:5432/<db>`

How you do that depends on your Compose approach:

- Compose will interpolate `${VAR}` from the environment/.env file.
- Keep `DATABASE_URL` and `POSTGRES_PASSWORD` aligned in the same `.env` file.

## Compose project naming

If you run multiple compose stacks on a single server, ensure stable project naming to avoid volume/network confusion.

Recommended approaches:

- Run compose from within the stack directory and keep `.env` next to it.
- Or set a project name explicitly:
  - `docker compose -p dondff up -d`

If you use a top-level “master” compose file with `include:`, ensure the environment variables (including project name) are available **where you run** `docker compose`.

## Build and deploy workflow

### Option A: Build locally, ship images (current model)

This is the recommended workflow when server bandwidth is limited and you want reproducible images.

1. Build images locally (backend and/or frontend)
2. Export them to tar files
3. Copy the tar files to the server
4. Load images on the server
5. Start or restart the compose stack

Typical commands:

- Export on local:
  - `docker save -o dondff-backend_latest.tar dondff-backend:latest`
  - `docker save -o dondff-frontend_latest.tar dondff-frontend:latest`

- Transfer to server:
  - `scp dondff-backend_latest.tar user@server:~/docker/dondff/images/`

- Load on server:
  - `docker load -i ~/docker/dondff/images/dondff-backend_latest.tar`

- Start stack:
  - `cd ~/docker && docker compose up -d`

### Option B: Build on the server

Pros:
- Less local work, no image transfers

Cons:
- Requires repo checkout on server
- Requires build toolchain on server
- Build results depend on server environment unless tightly pinned

Use this only if you prefer server-side builds or have significant CI/CD.

## Starting and stopping

From the directory where you run compose:

- Start:
  - `docker compose up -d`
- View logs:
  - `docker compose logs -f`
- Restart a service:
  - `docker compose restart <service>`

## Database volumes and resetting Postgres

### Understanding volumes

Compose will create volumes based on the project name and the volume key name. If project naming changes (or you run compose from a different directory/project), you can end up with multiple similar volumes.

### Identify which volume a container is using

- Inspect mounts:
  - `docker inspect <container> | grep -A3 Mounts`

- List volumes:
  - `docker volume ls`

### Reset only Postgres data

Recommended approach:

1. Stop the stack:
   - `docker compose down`
2. Remove only the Postgres volume:
   - `docker volume rm <your_postgres_volume_name>`
3. Start again:
   - `docker compose up -d`

Avoid `docker compose down -v` unless you intentionally want to remove **all** volumes for the project.

## Health checks

Use an HTTP health endpoint served by `health.controller.ts`.

Verify:

- `curl -f http://localhost:<backend-port>/health`

In compose:

- Backend should only be marked healthy when the health endpoint returns 200.

## Running migrations in production

Because production images are distroless, they typically do not include a shell (and may not include `node` in PATH for `docker compose exec`).

Recommended patterns:

- Run migrations as part of container startup (backend bootstrap) if you can tolerate it.
- Or run migrations in a separate “migration runner” image/stage that includes node tooling.

If you run migrations inside the running backend container:

- Ensure the container actually contains the runtime needed to execute migrations.
- Prefer `docker compose exec backend <absolute-path-to-node> dist/.../migrate.js` only if the runtime exists.

## Troubleshooting

### Backend container restarts immediately

- Inspect logs:
  - `docker compose logs -f backend`

Common causes:
- DB not reachable
- `DATABASE_URL` wrong
- Postgres database not created yet
- Migrations path mismatch (src vs dist)

### Postgres database does not exist

If Postgres logs show the DB wasn’t created, verify:

- `POSTGRES_DB` in compose
- Volume reset if the DB was initialized with a different name previously

After changing `POSTGRES_DB` or `POSTGRES_USER`, you generally must reset the Postgres volume because init only runs on first boot.

### Password authentication failed

Common causes:
- Changing `POSTGRES_PASSWORD` after the DB was initialized (volume already contains old password)
- Mismatch between `POSTGRES_PASSWORD` and `DATABASE_URL`

Fix:
- Ensure both values come from the same `.env` source
- Reset the Postgres volume if credentials changed

### Platform mismatch (arm64 vs amd64)

If you see platform warnings or failures:

- Ensure images are built for the server’s platform
- Build with:
  - `docker buildx build --platform linux/amd64 ...`

## Pre-deploy checklist

Before deploying a new version to a server, verify the following:

### Image readiness
- [ ] Backend image builds successfully locally
- [ ] Frontend image builds successfully locally
- [ ] Images are built for the correct platform (`linux/amd64` for most servers)
- [ ] Image tags are updated as expected (avoid relying on stale `latest` unintentionally)

### Configuration sanity
- [ ] `.env` file exists next to `docker-compose.yaml`
- [ ] All required environment variables are present:
  - `NODE_ENV`
  - `PORT`
  - `DB_ENGINE`
  - `POSTGRES_USER`
  - `POSTGRES_PASSWORD`
  - `POSTGRES_DB`
  - `DATABASE_URL`
  - `API_BASE_URL` (frontend)
- [ ] `DATABASE_URL` is constructed from the same credentials as Postgres init vars
- [ ] No secrets are hardcoded into compose files or images

### Database safety
- [ ] Confirm whether schema changes require a Postgres volume reset
- [ ] If credentials or DB name changed, plan to remove the existing Postgres volume
- [ ] Migrations are present in the image and point to the correct path (`dist`, not `src`)

### Docker / Compose correctness
- [ ] `docker compose config` renders without errors
- [ ] Service names are unique and prefixed if running alongside other stacks
- [ ] Networks used (`web`, `internal`, etc.) exist and are intentional
- [ ] Health checks are defined and reference valid endpoints

### Deployment mechanics
- [ ] Image tar files (if using local build → ship model) are transferred completely
- [ ] Images load cleanly on the server (`docker load`)
- [ ] Old containers are stopped before restart if needed
- [ ] No unexpected containers are restarting in a loop

Running through this checklist before each deployment greatly reduces the likelihood of runtime failures caused by environment drift or stale state.

## Verification checklist

After deployment:

- [ ] `docker compose ps` shows backend and postgres healthy
- [ ] Backend health endpoint returns 200
- [ ] Frontend loads in browser
- [ ] Frontend API base URL points to the public domain (e.g., `https://dondff.foxsly.org/api`)
- [ ] Create account / login works
- [ ] Core flows (league -> team -> entries) work end-to-end

```
