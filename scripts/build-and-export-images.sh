#!/usr/bin/env bash
set -euo pipefail

### CONFIG ##############################################################

TARGET="${1:-both}"   # backend | frontend | both
VERSION="${2:-latest}"

if [[ "${TARGET}" != "backend" && "${TARGET}" != "frontend" && "${TARGET}" != "both" ]]; then
  echo "Usage: $0 [backend|frontend|both] [version]"
  exit 1
fi

REMOTE_USER="docker"
REMOTE_HOST="sh2"
REMOTE_DIR="/home/docker/docker/dondff/images"

BACKEND_IMAGE="dondff-backend:${VERSION}"
FRONTEND_IMAGE="dondff-frontend:${VERSION}"

########################################################################

###
# Need to execute these locally first, before any of this works!
# docker buildx create --name dondff-builder --use
# docker buildx inspect --bootstrap
###

# Build for linux/amd64 so it runs on the server
if [[ "${TARGET}" == "backend" || "${TARGET}" == "both" ]]; then
  echo "==> Building backend image: ${BACKEND_IMAGE}"
  docker buildx build --platform linux/amd64 -t "${BACKEND_IMAGE}" --load ./backend
fi

if [[ "${TARGET}" == "frontend" || "${TARGET}" == "both" ]]; then
  echo "==> Building frontend image: ${FRONTEND_IMAGE}"
  docker buildx build --platform linux/amd64 -t "${FRONTEND_IMAGE}" --load ./frontend
fi

mkdir -p ./deploy

if [[ "${TARGET}" == "backend" || "${TARGET}" == "both" ]]; then
  BACKEND_TAR="./deploy/dondff-backend_${VERSION}.tar"
  echo "==> Saving backend image to tar file"
  docker save -o "${BACKEND_TAR}" "${BACKEND_IMAGE}"
fi

if [[ "${TARGET}" == "frontend" || "${TARGET}" == "both" ]]; then
  FRONTEND_TAR="./deploy/dondff-frontend_${VERSION}.tar"
  echo "==> Saving frontend image to tar file"
  docker save -o "${FRONTEND_TAR}" "${FRONTEND_IMAGE}"
fi

echo "==> Copying image files to server: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"

if [[ "${TARGET}" == "backend" || "${TARGET}" == "both" ]]; then
  scp "${BACKEND_TAR}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
fi

if [[ "${TARGET}" == "frontend" || "${TARGET}" == "both" ]]; then
  scp "${FRONTEND_TAR}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
fi

echo "==> Done!"
echo "Now SSH to your server and run: docker/dondff/load-images-and-up.sh ${TARGET} ${VERSION}"