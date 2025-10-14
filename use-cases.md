# Use Cases

## Create account
* Email address
* Password
* Name

## Login
* Email address & password
* MFA?

## Password reset
* Email address

## Logout

## View your leagues

## Join leagues
* Access code/invite

## Create leagues
* League details (name)

## Invite people to leagues
* Emails/accounts

## View specific league

## View weekly results for league
* Calculate player scores

## Create entry for league
* Play the game
* Track boxes/players & resets
* Get offers

# DB modeling
team_entry
- team_entry_id (UUID - PK)
- team_id (UUID - FK to team)
- position (string)
- reset_count (number)
  - start at 0
- selected_box (number)
team_entry_audit
- team_entry_id (FK - team_entry)
- player_id (string)
- player_name (string)
- projected_points (number)
  - based on scoring settings being used
- box_number (number)
- injury_status (string)
- box_status (string)
  - selected/eliminated/available/reset
team_entry_offer
- team_entry_id (FK - team_entry)
- offer_round (number)
- player_id (string)
- player_name (string)
- injury_status (string)
- projected_points (number)
  - based on scoring settings being used
- status (string)
  - accepted/rejected/pending