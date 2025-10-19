#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Base Tint filesystem crawler -> local Markdown exporter
# ------------------------------------------------------------------------------
# Usage:
#   ./export_base_tint.sh \
#     --base-url "https://base.tint.space" \
#     --start-path "repository/active/base/system" \
#     --out-dir "./_base_export" \
#     [--bearer "YOUR_TOKEN"] \
#     [--cookie "session=..."] \
#     [--rate-ms 0]
#
# Notes:
# - If both --bearer and --cookie are provided, both headers are sent.
# - Files are written exactly as returned in JSON .content (frontmatter + body).
# - Directory structure is mirrored under --out-dir.
# ------------------------------------------------------------------------------

BASE_URL=""
START_PATH=""
OUT_DIR=""
BEARER=""
COOKIE=""
RATE_MS="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url) BASE_URL="$2"; shift 2 ;;
    --start-path) START_PATH="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --bearer) BEARER="$2"; shift 2 ;;
    --cookie) COOKIE="$2"; shift 2 ;;
    --rate-ms) RATE_MS="$2"; shift 2 ;;
    -h|--help)
      grep -E "^# " "$0" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

if [[ -z "$BASE_URL" || -z "$START_PATH" || -z "$OUT_DIR" ]]; then
  echo "Missing required args. See --help." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# Build extra headers
HDRS=()
if [[ -n "$BEARER" ]]; then
  HDRS+=(-H "Authorization: Bearer ${BEARER}")
fi
if [[ -n "$COOKIE" ]]; then
  HDRS+=(-H "Cookie: ${COOKIE}")
fi

# Small helper to sleep between requests if rate limiting desired
rate_sleep() {
  local ms="${1:-0}"
  if [[ "$ms" != "0" ]]; then
    # sleep accepts seconds; convert ms->seconds with awk
    awk -v ms="$ms" 'BEGIN { printf("%.3f\n", ms/1000) }' | xargs sleep
  fi
}

# URL-encode a path using jq (portable)
urlencode() {
  local raw="$1"
  jq -rn --arg x "$raw" '$x|@uri'
}

# Fetch JSON from a GET endpoint
get_json() {
  local url="$1"
  curl -fsSL "${HDRS[@]}" "$url"
}

# Save a file’s .content to local path (mirrors server path)
save_markdown_file() {
  local path="$1"      # e.g. repository/active/base/system/guideline/foo.md
  local json="$2"

  # Prefer .content if present; else fall back to .markdown (some endpoints include both)
  local content
  # Use jq -er to fail if both missing
  content="$(printf '%s' "$json" | jq -er '.content // .markdown')"

  local dst="${OUT_DIR}/${path}"
  local dir
  dir="$(dirname "$dst")"
  mkdir -p "$dir"
  printf '%s' "$content" > "$dst"
  echo "Wrote: $dst"
}

# Walk a directory path recursively
walk_dir() {
  local dir_path="$1"  # path portion WITHOUT leading slash
  local enc
  enc="$(urlencode "/${dir_path}")"

  local url="${BASE_URL}/api/filesystem/directory?path=${enc}"
  echo "Dir: $dir_path"
  local json
  if ! json="$(get_json "$url")"; then
    echo "WARN: failed to fetch directory: $dir_path" >&2
    return 0
  fi
  rate_sleep "$RATE_MS"

  # Ensure we have items array
  local count
  count="$(printf '%s' "$json" | jq -r '.items | length')"
  if [[ "$count" == "null" ]]; then
    echo "WARN: no items for $dir_path" >&2
    return 0
  fi

  # Iterate items
  # For each item, we have .name and .type ("directory"|"file")
  printf '%s' "$json" | jq -rc '.items[] | {name, type}' | while read -r item; do
    local name type
    name="$(printf '%s' "$item" | jq -r '.name')"
    type="$(printf '%s' "$item" | jq -r '.type')"
    local child_path="${dir_path}/${name}"

    if [[ "$type" == "directory" ]]; then
      walk_dir "$child_path"
    elif [[ "$type" == "file" ]]; then
      fetch_file "$child_path"
    else
      echo "WARN: unknown item type ($type) at $child_path" >&2
    fi
  done
}

# Fetch a single file JSON and write its content
fetch_file() {
  local file_path="$1"  # e.g. repository/active/base/system/workflow/write-task.md
  local enc
  enc="$(urlencode "/${file_path}")"
  local url="${BASE_URL}/api/filesystem/file?path=${enc}"

  echo "File: $file_path"
  local json
  if ! json="$(get_json "$url")"; then
    echo "WARN: failed to fetch file: $file_path" >&2
    return 0
  fi
  rate_sleep "$RATE_MS"

  # Sanity check: ensure it's a file-like response
  local t
  t="$(printf '%s' "$json" | jq -r '.type // empty')"
  if [[ "$t" != "file" && -n "$t" ]]; then
    echo "WARN: unexpected type ($t) for $file_path" >&2
  fi

  save_markdown_file "$file_path" "$json"
}

# Kick off
walk_dir "$START_PATH"

echo "✅ Done. Exported under: $OUT_DIR"