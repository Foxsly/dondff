# syntax=docker/dockerfile:1.6

# ==========================================================
#  Multi-stage build for NestJS backend (distroless, rootless, tsc build)
#  Default DB: Postgres
#  Optional override: SQLite (via compose profile)
# ==========================================================

# ---------- Stage 1: Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci
## Patch TypeScript compiler for Typia/Nestia transform
RUN npx ts-patch install

# Copy source files and configs
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Compile (tsc) + alias rewrite (tsc-alias) using project script
RUN npm run build

# Remove dev dependencies for production
RUN npm prune --omit=dev


# ---------- Stage 2: Runner (Distroless, Rootless) ----------
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner

# Non-root user
USER 65532:65532

WORKDIR /app

# Volume for SQLite exceptions or other runtime data
VOLUME ["/data"]

# Default environment variables
ENV NODE_ENV=production \
    PORT=3001

# Copy build artifacts and production deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expose service port
EXPOSE 3001

# Launch dist/bootstrap.js (will run migrations + start app)
CMD ["dist/bootstrap.js"]
