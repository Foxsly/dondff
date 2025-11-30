#!/usr/bin/env bash
set -euo pipefail

# --- CONFIG ---
OUT_NAME="frontend-context.zip"
TMP_DIR="_ctx_frontend"

# Detect frontend source dir:
# - If a "frontend" folder exists, assume repo root and use it.
# - Else, if we're already inside a frontend app (has src/ and package.json), use "."
if [[ -d "frontend" ]]; then
  SRC_DIR="frontend"
elif [[ -d "src" && -f "package.json" ]]; then
  SRC_DIR="."
else
  echo "❌ Could not locate frontend source."
  echo "Run this from repo root (with a ./frontend folder) or inside the frontend directory."
  exit 1
fi

# Exclude patterns (quoted so the shell doesn't expand globs)
EXCLUDES=(
  "node_modules"
  "dist"
  "build"
  ".turbo"
  ".cache"
  ".next"
  ".DS_Store"
  "*.log"
  "*.sqlite"
  "*.db"
  "*.env*"
  ".git"
  "coverage"
  "tmp"
)

# Build rsync exclude args (one --exclude per pattern)
RSYNC_EXCLUDES=()
for pat in "${EXCLUDES[@]}"; do
  RSYNC_EXCLUDES+=(--exclude "$pat")
done

echo "Preparing temporary export directory..."
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

echo "Copying frontend files from '$SRC_DIR'..."
# Trailing slashes are important to copy contents, not the directory itself.
rsync -a "${RSYNC_EXCLUDES[@]}" "$SRC_DIR"/ "$TMP_DIR"/ --prune-empty-dirs

echo "Size of temp copy:"
du -sh "$TMP_DIR" || true

echo "Creating archive: $OUT_NAME"
# Zip the temp dir into a single archive
rm -f "$OUT_NAME"
zip -r "$OUT_NAME" "$TMP_DIR" > /dev/null

echo "Cleaning up temp directory..."
rm -rf "$TMP_DIR"

echo "✅ Export complete: $OUT_NAME"