#!/usr/bin/env bash
### NOTE - THIS LIVES ON THE SERVER FOR DEPLOYMENT PURPOSES
set -euo pipefail

VERSION="${1:-latest}"
IMAGEDIR="/home/docker/docker/dondff/images"
COMPOSEDIR="/home/docker/docker/dondff"

BACKEND_TAR="${IMAGEDIR}/dondff-backend_${VERSION}.tar"
FRONTEND_TAR="${IMAGEDIR}/dondff-frontend_${VERSION}.tar"

echo "==> Loading backend image: ${BACKEND_TAR}"
docker load -i "${BACKEND_TAR}"

echo "==> Loading frontend image: ${FRONTEND_TAR}"
docker load -i "${FRONTEND_TAR}"

echo "==> Pulling postgres (if needed)"
docker pull postgres:16-alpine || true

echo "==> Starting services via docker-compose"
cd "${COMPOSEDIR}"
docker compose up -d

echo "==> Applying migrations"
docker compose exec backend /nodejs/bin/node dist/infrastructure/database/migrate.js

echo "==> Deployment complete!"
docker compose ps