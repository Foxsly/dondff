#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:3001"
JSON_CT="Content-Type: application/json"

command -v jq >/dev/null 2>&1 || { echo "❌ jq is required (brew install jq / apt-get install jq)"; exit 1; }

# ---- HTTP helpers -----------------------------------------------------------
get()  { curl -sS -X GET    "$1" -H "$JSON_CT"; }
post() { curl -sS -X POST   "$1" -H "$JSON_CT" -d "$2"; }
put()  { curl -sS -X PUT    "$1" -H "$JSON_CT" -d "$2"; }

# Try endpoint, return empty array/object on 404
get_or_empty() {
  local url="$1"
  if ! out=$(get "$url"); then
    echo ""
  else
    echo "$out"
  fi
}

# ---- Find-or-create helpers -------------------------------------------------
find_user_by_email() {
  local email="$1"
  # Prefer /users?email=... if your API supports it; else GET /users and filter
  local res
  res=$(get_or_empty "$BASE_URL/users?email=$(printf %s "$email" | jq -sRr @uri)")
  if [[ -n "$res" && "$res" != "null" && "$res" != "" ]]; then
    # Accept either a single object OR array from your API
    echo "$res" | jq -r 'if type=="array" then (.[0]?.userId // empty) else .userId end' | sed '/^null$/d'
    return
  fi
  res=$(get_or_empty "$BASE_URL/users")
  [[ -z "$res" ]] && { echo ""; return; }
  echo "$res" | jq -r --arg email "$email" '.[] | select(.email==$email) | .userId' | head -n1
}

create_user() {
  local name="$1" email="$2"
  post "$BASE_URL/users" "$(jq -n --arg name "$name" --arg email "$email" '{name:$name,email:$email}')" \
    | jq -r '.userId'
}

find_or_create_user() {
  local name="$1" email="$2"
  local id
  id=$(find_user_by_email "$email" || true)
  if [[ -n "${id:-}" ]]; then
    echo "$id"
  else
    create_user "$name" "$email"
  fi
}

find_league_by_name() {
  local name="$1"
  # Prefer /leagues?name=
  local res
  res=$(get_or_empty "$BASE_URL/leagues?name=$(printf %s "$name" | jq -sRr @uri)")
  if [[ -n "$res" && "$res" != "null" && "$res" != "" ]]; then
    echo "$res" | jq -r 'if type=="array" then (.[0]?.leagueId // empty) else .leagueId end' | sed '/^null$/d'
    return
  fi
  res=$(get_or_empty "$BASE_URL/leagues")
  [[ -z "$res" ]] && { echo ""; return; }
  echo "$res" | jq -r --arg name "$name" '.[] | select(.name==$name) | .leagueId' | head -n1
}

create_league() {
  local name="$1"
  post "$BASE_URL/leagues" "$(jq -n --arg name "$name" '{name:$name}')" \
    | jq -r '.leagueId'
}

find_or_create_league() {
  local name="$1"
  local id
  id=$(find_league_by_name "$name" || true)
  if [[ -n "${id:-}" ]]; then
    echo "$id"
  else
    create_league "$name"
  fi
}

ensure_league_membership() {
  local leagueId="$1" userId="$2" role="$3"
  # If your API supports GET /leagues/{id}/users, check first
  local members
  members=$(get_or_empty "$BASE_URL/leagues/$leagueId/users")
  if [[ -n "$members" ]]; then
    local exists
    exists=$(echo "$members" | jq -e --arg uid "$userId" 'map(select(.userId==$uid)) | length>0' >/dev/null 2>&1 && echo "y" || echo "n")
    if [[ "$exists" == "y" ]]; then
      # Optionally check role and re-PUT if you want to update role
      :
    fi
  fi
  # PUT is idempotent/upsert by design in your API spec
  put "$BASE_URL/leagues/$leagueId/users" "$(jq -n --arg uid "$userId" --arg role "$role" '{userId:$uid, role:$role}')" >/dev/null
}

find_team() {
  local leagueId="$1" userId="$2" seasonYear="$3" week="$4"
  # Prefer a filterable endpoint if available
  local res
  res=$(get_or_empty "$BASE_URL/teams?leagueId=$leagueId&userId=$userId&seasonYear=$seasonYear&week=$week")
  if [[ -n "$res" && "$res" != "null" && "$res" != "" ]]; then
    echo "$res" | jq -r 'if type=="array" then (.[0]?.teamId // empty) else .teamId end' | sed '/^null$/d'
    return
  fi
  res=$(get_or_empty "$BASE_URL/teams")
  [[ -z "$res" ]] && { echo ""; return; }
  echo "$res" | jq -r --arg l "$leagueId" --arg u "$userId" --argjson y "$seasonYear" --argjson w "$week" \
    '.[] | select(.leagueId==$l and .userId==$u and .seasonYear==$y and .week==$w) | .teamId' | head -n1
}

create_team() {
  local leagueId="$1" userId="$2" seasonYear="$3" week="$4"
  post "$BASE_URL/teams" "$(jq -n --arg l "$leagueId" --arg u "$userId" --argjson y "$seasonYear" --argjson w "$week" \
    '{leagueId:$l, userId:$u, seasonYear:$y, week:$w}')" \
    | jq -r '.teamId'
}

find_or_create_team() {
  local leagueId="$1" userId="$2" seasonYear="$3" week="$4"
  local id
  id=$(find_team "$leagueId" "$userId" "$seasonYear" "$week" || true)
  if [[ -n "${id:-}" ]]; then
    echo "$id"
  else
    create_team "$leagueId" "$userId" "$seasonYear" "$week"
  fi
}

team_has_player_position() {
  local teamId="$1" position="$2"
  local res
  res=$(get_or_empty "$BASE_URL/teams/$teamId/players")
  [[ -z "$res" ]] && { echo "n"; return; }
  echo "$res" | jq -e --arg pos "$position" 'map(select(.position==$pos)) | length>0' >/dev/null 2>&1 && echo "y" || echo "n"
}

ensure_player_on_team() {
  local teamId="$1" position="$2" playerId="$3" playerName="$4"
  if [[ "$(team_has_player_position "$teamId" "$position")" == "y" ]]; then
    return
  fi
  post "$BASE_URL/teams/$teamId/players" "$(jq -n \
    --arg pos "$position" --argjson pid "$playerId" --arg name "$playerName" \
    '{position:$pos, playerId:$pid, playerName:$name}')" >/dev/null
}

# ---- Seed data --------------------------------------------------------------
echo "🏈 Seeding Detroit Lions data into $BASE_URL ..."

# Unique emails each run to avoid constraint conflicts if idempotency endpoints are limited
ts=$(date +%s)
DAN_EMAIL="dan.campbell+$ts@example.com"
BRAD_EMAIL="brad.holmes+$ts@example.com"

# Users
echo "→ Ensuring users exist"
DAN_USER_ID=$(find_or_create_user "Dan Campbell" "$DAN_EMAIL")
BRAD_USER_ID=$(find_or_create_user "Brad Holmes"  "$BRAD_EMAIL")
echo "   ✓ Dan:  $DAN_USER_ID"
echo "   ✓ Brad: $BRAD_USER_ID"

# League
echo "→ Ensuring league exists"
LEAGUE_NAME="Honolulu Blue 2025"
LEAGUE_ID=$(find_or_create_league "$LEAGUE_NAME")
echo "   ✓ League: $LEAGUE_ID ($LEAGUE_NAME)"

# Memberships (idempotent via PUT)
echo "→ Ensuring league memberships"
ensure_league_membership "$LEAGUE_ID" "$DAN_USER_ID"  "owner"
ensure_league_membership "$LEAGUE_ID" "$BRAD_USER_ID" "member"
echo "   ✓ Dan owner, Brad member"

# Teams
echo "→ Ensuring teams exist (season 2025, week 1)"
TEAM_DAN_ID=$(find_or_create_team "$LEAGUE_ID" "$DAN_USER_ID" 2025 1)
TEAM_BRAD_ID=$(find_or_create_team "$LEAGUE_ID" "$BRAD_USER_ID" 2025 1)
echo "   ✓ Dan team:  $TEAM_DAN_ID"
echo "   ✓ Brad team: $TEAM_BRAD_ID"

# Players (avoid duplicates by position per team)
echo "→ Ensuring players on teams (Lions)"
ensure_player_on_team "$TEAM_DAN_ID"  "QB"  11601 "Jared Goff"
ensure_player_on_team "$TEAM_DAN_ID"  "WR"  11901 "Amon-Ra St. Brown"
ensure_player_on_team "$TEAM_BRAD_ID" "RB"  11877 "Jahmyr Gibbs"
ensure_player_on_team "$TEAM_BRAD_ID" "TE"  11890 "Sam LaPorta"
echo "   ✓ Players ensured"

echo ""
echo "✅ Done! Summary:"
echo "   Users:   Dan=$DAN_USER_ID, Brad=$BRAD_USER_ID"
echo "   League:  $LEAGUE_ID (Honolulu Blue 2025)"
echo "   Teams:   DanTeam=$TEAM_DAN_ID, BradTeam=$TEAM_BRAD_ID"
echo ""
echo "Notes:"
echo " - If your API supports direct filtering (e.g., /users?email=...), the script uses it."
echo " - Otherwise it falls back to listing and filtering client-side with jq."