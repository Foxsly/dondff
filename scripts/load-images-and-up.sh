#!/usr/bin/env bash
### NOTE - THIS LIVES ON THE SERVER FOR DEPLOYMENT PURPOSES
set -euo pipefail

TARGET="${1:-both}"   # backend | frontend | both
VERSION="${2:-latest}"

if [[ "${TARGET}" != "backend" && "${TARGET}" != "frontend" && "${TARGET}" != "both" ]]; then
  echo "Usage: $0 [backend|frontend|both] [version]"
  exit 1
fi

IMAGEDIR="/home/docker/docker/dondff/images"
COMPOSEDIR="/home/docker/docker/dondff"

if [[ "${TARGET}" == "backend" || "${TARGET}" == "both" ]]; then
  BACKEND_TAR="${IMAGEDIR}/dondff-backend_${VERSION}.tar"
  echo "==> Loading backend image: ${BACKEND_TAR}"
  docker load -i "${BACKEND_TAR}"
fi

if [[ "${TARGET}" == "frontend" || "${TARGET}" == "both" ]]; then
  FRONTEND_TAR="${IMAGEDIR}/dondff-frontend_${VERSION}.tar"
  echo "==> Loading frontend image: ${FRONTEND_TAR}"
  docker load -i "${FRONTEND_TAR}"
fi

echo "==> Pulling postgres (if needed)"
docker pull postgres:16-alpine || true

echo "==> Starting services via docker-compose"
cd "${COMPOSEDIR}"
docker compose up -d

echo "==> Applying migrations"
docker compose exec backend /nodejs/bin/node dist/infrastructure/database/migrate.js

echo "==> Deployment complete!"
docker compose ps