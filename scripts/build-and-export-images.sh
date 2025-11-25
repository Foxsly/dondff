#!/usr/bin/env bash
set -euo pipefail

### CONFIG ##############################################################

VERSION="${1:-latest}"   # allow: ./script.sh 2025-01-01
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
echo "==> Building backend image: ${BACKEND_IMAGE}"
docker buildx build --platform linux/amd64 -t "${BACKEND_IMAGE}" --load ./backend

echo "==> Building frontend image: ${FRONTEND_IMAGE}"
docker buildx build --platform linux/amd64 -t "${FRONTEND_IMAGE}" --load ./frontend

mkdir -p ./deploy

BACKEND_TAR="./deploy/dondff-backend_${VERSION}.tar"
FRONTEND_TAR="./deploy/dondff-frontend_${VERSION}.tar"

echo "==> Saving images to tar files"
docker save -o "${BACKEND_TAR}"   "${BACKEND_IMAGE}"
docker save -o "${FRONTEND_TAR}"  "${FRONTEND_IMAGE}"

echo "==> Copying image files to server: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"

scp "${BACKEND_TAR}"  "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"
scp "${FRONTEND_TAR}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> Done!"
echo "Now SSH to your server and run: docker/dondff/load-images-and-up.sh ${VERSION}"