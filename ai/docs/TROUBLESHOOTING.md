# Top 5 Most Common Fixes

1. **TypeScript / typia tests failing**
   - Symptom: `Error on typia...: no transform has been configured`
   - Most common root cause: `isolatedModules: true` (breaks typia transforms)
   - Fix (steps):
     - Open `backend/tsconfig.json` and set:
       - `"isolatedModules": false`
     - Confirm `ts-patch` is applied (project uses patched `tsc`):
       - `npx ts-patch install`
     - Sanity-check compilation uses `tsc`:
       - `npm run typecheck` (or `npx tsc -p tsconfig.json --noEmit`)
     - Re-run the failing test:
       - `npm run test` or `npm run test:e2e`

2. **NestJS app starts but crashes immediately**
   - Symptom: Nest logs “successfully started” then exits / restarts
   - Fix (steps):
     - Check the container/app logs for the *first* fatal error:
       - Docker: `docker compose logs -f dondff-backend`
       - Local: run the same start command in a terminal to see stack traces
     - Verify required env vars are present:
       - `NODE_ENV`, `PORT`, `DB_ENGINE`, `DATABASE_URL` (for Postgres)
     - Confirm the start script points at the right entry:
       - Prod should run Node on `dist/**` (example: `node dist/bootstrap.js`)
     - If this happens in Docker distroless images:
       - You can’t exec `sh`/`npm` inside the runtime image; run diagnostics from the host using `docker logs` and compose health checks.

3. **Docker container can’t find files at runtime (src vs dist)**
   - Symptom: `ENOENT ... scandir '/app/src/.../migrations'` or similar under `/app/src`
   - Root cause: runtime code is referencing `src/**` paths in a container that only contains `dist/**`
   - Fix (steps):
     - Identify the failing runtime path from logs (keep the full path).
     - Update the migration/path resolver to select the correct folder at runtime:
       - Prefer `dist/**` in production containers.
       - Avoid hardcoding `src/**` into runtime paths.
     - Rebuild the image and re-deploy:
       - `docker compose build dondff-backend`
       - `docker compose up -d dondff-backend`
     - Confirm by re-checking logs:
       - `docker compose logs -f dondff-backend`

4. **Postgres connection or auth failures**
   - Symptoms:
     - `database "X" does not exist`
     - `password authentication failed for user "Y"`
   - Most common root cause: Postgres initialization only runs on *first* volume creation; changing env vars later does not update existing roles/dbs.
   - Fix (steps):
     - Confirm what env vars the Postgres container is actually using:
       - `docker compose exec dondff-postgres printenv | grep POSTGRES`
     - Confirm what the backend is using:
       - `docker compose logs --tail=200 dondff-backend` (look for `DATABASE_URL` preview if logged)
     - If you changed any of: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, or `DATABASE_URL`:
       - Remove only the Postgres volume so init can re-run:
         - `docker compose down`
         - `docker volume ls | grep pgdata`
         - `docker volume rm <the-postgres-volume>`
       - Start again:
         - `docker compose up -d`
     - Verify DB exists:
       - `docker compose exec dondff-postgres psql -U <user> -d <db> -c '\\l'`

5. **Frontend calling the wrong backend URL**
   - Symptoms:
     - Requests go to `localhost:3000` in production
     - Requests go to `backend:3001` from the browser
     - `window.RUNTIME_CONFIG` is undefined
   - Fix (steps):
     - In the browser devtools, confirm `GET /runtime-env.js` returns 200 and contains `window.RUNTIME_CONFIG`.
     - Navigate directly to `https://<your-domain>/runtime-env.js` and confirm it serves the file.
     - Confirm frontend code uses runtime config with a safe default:
       - `window.RUNTIME_CONFIG?.API_BASE_URL ?? '/api'`
     - Confirm reverse proxy routing:
       - `GET https://<your-domain>/api/health` should reach the backend health endpoint.
     - If `runtime-env.js` isn’t served:
       - Ensure it’s included in the static output and not blocked by the server/proxy.

# Troubleshooting Guide

---

## 1. Development & Build Issues (TypeScript, NestJS, typia, ts-patch) [DEV][BUILD]

### Issue: TypeScript Compilation Errors
- **Symptoms:** Build fails with type errors or missing types.
- **Root Cause:** Incorrect TypeScript version, misconfigured `tsconfig.json`, or incompatible dependencies.
- **Resolution:**
  - Verify TypeScript version matches project requirements.
  - Check `tsconfig.json` for proper compiler options.
  - Run `npm install` or `yarn` to ensure dependencies are up to date.
  - Clear build cache and retry: `rm -rf node_modules && npm install`.

### Issue: NestJS Application Fails to Start
- **Symptoms:** Server does not start or crashes on launch.
- **Root Cause:** Missing or misconfigured modules, circular dependencies, or incorrect environment variables.
- **Resolution:**
  - Check module imports and providers for circular references.
  - Validate environment variables required by NestJS.
  - Review logs for specific error messages.
  - Run `nest build` separately to isolate build issues.

### Issue: typia Code Generation Fails
- **Symptoms:** Generated types or validators are missing or incorrect.
- **Root Cause:** typia version mismatch or improper usage in build scripts.
- **Resolution:**
  - Confirm typia version compatibility.
  - Ensure `ts-patch` is applied correctly before running typia.
  - Run typia generation commands manually to check errors.

### Issue: ts-patch Not Applied or Causes Errors
- **Symptoms:** Build fails or typia generation errors related to patched TypeScript.
- **Root Cause:** ts-patch not installed, or incompatible TypeScript version.
- **Resolution:**
  - Run `npx ts-patch install` to apply patch.
  - Verify TypeScript version supports ts-patch.
  - Reinstall node_modules if patching fails.

### Issue: `npm run start:dev` does not create `dist/` and fails with `Cannot find module .../dist/main`
- **Symptoms:**
  - `Error: Cannot find module '/.../backend/dist/main'`
  - `ls dist` shows `No such file or directory` even while watch output says “Found 0 errors”
- **Root Cause (most common):**
  - `rootDir` configured in a way that causes emitted output to be written somewhere unexpected (or not where the runtime expects).
- **Resolution (steps):**
  - Check whether `tsc -w` produces output:
    - `npx tsc -w -p tsconfig.build.json`
    - Confirm `dist/main.js` appears.
  - Inspect `tsconfig.json` and `tsconfig.build.json` for `rootDir`:
    - If present and output is not created where expected, remove `rootDir` (or ensure it matches the actual source root).
  - Ensure `nest-cli.json` points to the correct entry file and output directory.
  - Re-run:
    - `npm run start:dev`

---

## 2. Docker & Container Runtime Issues [DOCKER][RUNTIME]

### Issue: Container Fails to Build
- **Symptoms:** Docker build errors or context issues.
- **Root Cause:** Incorrect Dockerfile syntax, missing files, or incorrect build context.
- **Resolution:**
  - Check Dockerfile for syntax errors.
  - Verify build context path and included files.
  - Use `.dockerignore` to exclude unnecessary files.

### Issue: Container Crashes on Startup
- **Symptoms:** Container exits immediately after starting.
- **Root Cause:** Missing environment variables, incorrect entrypoint, or runtime errors.
- **Resolution:**
  - Inspect container logs with `docker logs <container_id>`.
  - Confirm all required environment variables are set.
  - Verify entrypoint and command in Dockerfile or compose file.

### Issue: `docker compose exec ... sh` or `npm` or `node` not found
- **Symptoms:**
  - `exec: "sh": executable file not found in $PATH`
  - `exec: "npm": executable file not found in $PATH`
  - `exec: "node": executable file not found in $PATH`
- **Root Cause:**
  - Runtime images are distroless/rootless and intentionally do not contain a shell or package manager (and may not expose `node` the way typical images do).
- **Resolution:**
  - Use host-side commands instead of exec-ing a shell:
    - View logs: `docker compose logs -f <service>`
    - Inspect config: `docker compose config`
  - For one-off debugging, use a separate debug image/stage that includes a shell (builder image) rather than changing the production image.

### Issue: Network Connectivity Problems Between Containers
- **Symptoms:** Services cannot communicate within Docker network.
- **Root Cause:** Incorrect Docker network settings or port mappings.
- **Resolution:**
  - Ensure containers are on the same user-defined network.
  - Verify exposed ports and service URLs.
  - Use `docker network inspect` to check network configuration.

---

## 3. Database & Migrations (SQLite & Postgres) [DB][MIGRATIONS]

### Issue: SQLite `ON DELETE CASCADE` not working
- **Symptoms:**
  - Deleting a `team` row does not delete dependent rows in `teamEntry`, `teamPlayer`, etc.
- **Root Cause:**
  - SQLite foreign key enforcement is off unless enabled (must be on for cascades to work).
- **Resolution (steps):**
  - Ensure the SQLite connection enables foreign keys:
    - Execute `PRAGMA foreign_keys = ON` on every connection.
  - Re-run the failing operation/test after enabling.
  - If using Kysely + better-sqlite3, ensure the pragma runs during DB initialization.

### Issue: Postgres error `pg_catalog.json_object(...) does not exist`
- **Symptoms:**
  - Postgres throws `function pg_catalog.json_object(...) does not exist` during a query.
- **Root Cause:**
  - A query is using SQLite-style JSON helpers (or otherwise non-portable JSON construction) that Postgres doesn’t support as written.
- **Resolution (steps):**
  - Locate the failing query from logs/stack trace (repository + line number).
  - Implement engine-aware JSON construction in the repository:
    - Postgres: use `json_build_object` / `jsonb_build_object` (or equivalent Kysely helper)
    - SQLite: use `json_object`
  - Keep the branching in the repository (do not leak engine checks into services/controllers).

### Issue: Migration Scripts Fail to Run
- **Symptoms:** Errors during migration execution or schema not updated.
- **Root Cause:** Incorrect migration files, database connection issues, or permission problems.
- **Resolution:**
  - Confirm database connection parameters.
  - Review migration scripts for syntax errors.
  - Check database user permissions.
  - Run migrations manually for debugging.

### Issue: SQLite Database Locked or Unresponsive
- **Symptoms:** Lock errors or slow queries.
- **Root Cause:** Concurrent access conflicts or file permission issues.
- **Resolution:**
  - Avoid concurrent writes to SQLite database.
  - Ensure file permissions allow read/write access.
  - Consider using Postgres for concurrent environments.

### Issue: Postgres Connection Failures
- **Symptoms:** Application cannot connect to Postgres.
- **Root Cause:** Incorrect credentials, network issues, or Postgres service down.
- **Resolution:**
  - Verify connection string and credentials.
  - Confirm Postgres service is running.
  - Check firewall or network policies.

---

## 4. Frontend ↔ Backend Integration Issues [INTEGRATION][API]

### Issue: API Calls Fail or Return Errors
- **Symptoms:** Frontend receives HTTP errors or unexpected responses.
- **Root Cause:** Mismatched API endpoints, CORS issues, or backend errors.
- **Resolution:**
  - Verify API endpoint URLs and HTTP methods.
  - Check backend logs for error details.
  - Confirm CORS policies allow frontend origin.
  - Use browser developer tools to inspect requests and responses.

### Issue: Data Format or Schema Mismatches
- **Symptoms:** Frontend crashes or displays incorrect data.
- **Root Cause:** Backend response schema differs from frontend expectations.
- **Resolution:**
  - Synchronize API contracts and data models.
  - Use API schema validation tools.
  - Update frontend data handling to match backend changes.

---

## 5. Game Logic / API Contract Issues [GAME][DOMAIN]

### Issue: Game State Inconsistencies
- **Symptoms:** Unexpected game behavior or desynchronized state.
- **Root Cause:** API contract changes, race conditions, or incorrect state updates.
- **Resolution:**
  - Review API contract versioning and update frontend accordingly.
  - Add logging around state transitions.
  - Test concurrency scenarios.

### Issue: API Contract Changes Break Clients
- **Symptoms:** Clients fail after backend updates.
- **Root Cause:** Breaking changes without backward compatibility.
- **Resolution:**
  - Use semantic versioning for API.
  - Communicate breaking changes clearly.
  - Maintain backward-compatible endpoints when possible.

---

## 6. Rare / Historical Issues (for reference only) [HISTORICAL]

### Issue: Legacy TypeScript Features Not Supported
- **Symptoms:** Older syntax or decorators cause build errors.
- **Root Cause:** Upgraded TypeScript version drops support for legacy features.
- **Resolution:**
  - Refactor code to use supported syntax.
  - Consult TypeScript migration guides.

### Issue: Intermittent Docker Volume Mount Failures
- **Symptoms:** Container does not see updated files.
- **Root Cause:** Host OS file system caching or Docker bugs.
- **Resolution:**
  - Restart Docker daemon.
  - Use named volumes instead of bind mounts where appropriate.

### Issue: Rare Database Deadlocks
- **Symptoms:** Transactions fail or timeout.
- **Root Cause:** Complex concurrent transactions.
- **Resolution:**
  - Optimize transaction scope.
  - Use appropriate isolation levels.

---


## Common Command Toolbox [REFERENCE]

A grab-bag of commands we repeatedly used while debugging. This is intentionally practical and copy‑pasteable.

### Docker / Compose

- Show resolved compose configuration (very useful with includes):
  ```
  docker compose config
  ```

- Tail logs for a single service:
  ```
  docker compose logs -f <service>
  ```

- Restart a single service:
  ```
  docker compose up -d --no-deps --build <service>
  ```

- List containers with project/service names:
  ```
  docker compose ps
  ```

- Inspect container environment variables:
  ```
  docker inspect <container> --format '{{json .Config.Env}}'
  ```

- Inspect which volumes a container is using:
  ```
  docker inspect <container> --format '{{json .Mounts}}'
  ```

### Docker Volumes

- List volumes:
  ```
  docker volume ls
  ```

- Inspect a specific volume:
  ```
  docker volume inspect <volume>
  ```

- Remove only the Postgres volume (after compose down):
  ```
  docker volume rm <pgdata-volume-name>
  ```

### Images & Size Analysis

- Show image sizes:
  ```
  docker images
  ```

- Compare layers in an image:
  ```
  docker history <image>
  ```

- Run size inspection in a *builder* image (not distroless):
  ```
  docker run --rm -it <builder-image> sh -c 'du -sh /app/* /app/node_modules'
  ```

### Networking / Routing

- Verify backend health through proxy:
  ```
  curl https://<domain>/api/health
  ```

- Test backend container directly (inside network):
  ```
  docker compose exec <backend> curl http://localhost:3001/health
  ```

- Inspect Docker networks:
  ```
  docker network ls
  docker network inspect <network>
  ```

### Postgres

- Exec into Postgres:
  ```
  docker compose exec <postgres> psql -U <user> -d <db>
  ```

- List databases:
  ```
  \\l
  ```

- List tables:
  ```
  \\dt
  ```

- Check roles:
  ```
  \\du
  ```

### SQLite (local / tests)

- Open DB:
  ```
  sqlite3 <db-file>
  ```

- Verify foreign keys are enabled:
  ```
  PRAGMA foreign_keys;
  ```

- Enable foreign keys (session):
  ```
  PRAGMA foreign_keys = ON;
  ```

### Node / TypeScript

- Verify which TypeScript is being used:
  ```
  npx tsc --version
  ```

- Run patched compiler sanity check:
  ```
  npx tsc -p tsconfig.json --noEmit
  ```

- Confirm ts‑patch is applied:
  ```
  npx ts-patch check
  ```

### Frontend Runtime Config

- Verify runtime config is served:
  ```
  curl https://<domain>/runtime-env.js
  ```

- Inspect runtime config in browser:
  ```
  window.RUNTIME_CONFIG
  ```

---

Rule of thumb:
- If it’s **distroless**, debug from the *host*.
- If it’s **stateful**, inspect the *volume*.
- If it “worked yesterday”, check *env + volumes first*.
