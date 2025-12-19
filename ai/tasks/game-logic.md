# Game flow
1. User hits "play game"
2. `team` entity is created (POST to `/teams`)
   1. This also generates the cases for that round - populating `TEAM_ENTRY` and `TEAM_ENTRY_AUDIT`
3. Retrieve the cases to display (GET to `/teams/{teamId}/cases`)
4. UI renders the cases and player list, with projections, team and injury status (same as today)
   1. The UI *CANNOT* know about which player is in which case, otherwise users can inspect that and cheat
5. User selects their box (POST to `/teams/{teamId}/cases`)
   1. This returns the boxes/players to eliminate, as well as the initial offer
6. User chooses to accept or decline the offer. 
   1. If accepting: POST to `/teams/{teamId}/offers`, all boxes are revealed
   2. If declining: POST to `/teams/{teamId}/offers`, returns new boxes to eliminate and new offer
7. Repeat until player accepts, or we get to last two boxes, at which point the user can choose to keep or swap, which makes another POST to `/teams/{teamId}/offers`

Alternatively, the user could choose to reset their box once after being presented the player list,
but before they choose a box. This would be a POST to `/teams/{teamId}/cases/reset` which returns the new player list,
and we return to the UI rendering cases for the user to choose

## Tasks
* Create a new API for `GET /teams/{teamId}/cases`
  * Includes a query parameter for position
  * Returns the cases for a teamId from TEAM_ENTRY and TEAM_ENTRY_AUDIT 
* Create a new API for `POST /teams/{teamId}/cases`
  * Updates the TEAM_ENTRY with the selected case
  * Input: includes an action (`selectCase`), position, and the case number
  * Returns: success or failure - error if a case is already selected
* Create a new API for `POST /teams/{teamId}/cases/reset`
  * Resets the cases for a game - shouldn't be allowed if the reset limit has been reached already, or if a case has already been selected
  * Input: position
  * Returns: new player list
* Create a new API for `GET /teams/{teamId}/offers`
  * Returns the current offer for a TEAM_ENTRY, based on the boxes that have not been eliminated
  * Includes a query parameter for position
* Create a new API for `POST /teams/{teamId}/offers`
  * Input: position, action (`ACCEPT, DECLINE, KEEP, SWAP`)
  * Returns: case numbers & players to eliminate, new offer
* Update the `POST /teams` API to also generate the cases for the round
* All endpoints above should be in `teams.controller.ts`
* Include E2E tests for all endpoints created above


* Keep this method the same, create a new API `/teams/{teamId}/cases` that:
* - GET: returns the cases (split this by position, probably - query param?)
* - POST: selects a case for a position - not idempotent, because
*         a subsequent call when you've already selected a case will error
*
* Then, another API `/teams/{teamId}/offers` that:
* - GET: returns the current offer (split by position via query param)
* - POST: accepts or declines the current offer;
*         returns the cases to eliminate, plus the new offer
*         ?? Does this also handle the keep/swap at the end?
*/