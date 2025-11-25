# syntax=docker/dockerfile:1.6

# ==========================================================
#  Stage 1: Build (Node + CRA + Tailwind)
# ==========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source
COPY . .

# API base for CRA at build-time (can be overridden via build args)
ARG REACT_APP_API_BASE=http://backend:3001
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}

# Create production build (Tailwind + CRA)
RUN npm run build

# ==========================================================
#  Stage 2: Runtime (distroless Node, non-root)
#  - Serves static files from /app/build with a tiny Node server
# ==========================================================
FROM gcr.io/distroless/nodejs20-debian11:nonroot

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/build ./build

# Copy minimal static file server
COPY server.mjs ./server.mjs

# Runtime env
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# distroless node image uses `node` as entrypoint; we just pass the script
CMD ["server.mjs"]