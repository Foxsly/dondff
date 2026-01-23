# GOLF

What would we need to change to support golf as a sport (instead of just NFL football)?
Assume that you would choose 3 golfers, and the offers would be calculated based on FD salary

## General
- There are a lot of references to weeks and seasons that we may need to reconsider
  - week - we could re-purpose this to be a PGA event ID for golf; I'd want to consider renaming the DB columns though

## Frontend
- There is no way to select what sport you want to create a league for
- `seasons.js` uses the `state` call to sleeper to figure out what to display
- `weeks.js` uses the `state` call to sleeper to figure out what to display and displays NFL specific logic 
- `entries.js`
  - uses sleeper `state` call
  - explicitly references WR and RB in numerous places
- `game.js`
  - explicitly references WR and RB in numerous places
  - Only supports switching from RB to WR

## Backend
- league_settings have football specific things hardcoded (and are not modifiable)
- **Look for spots where we're calling `SleeperService` or `PlayerStatsService`**
  - These are the most likely places that we would need to make changes
- many references to `projectedPoints` that could store salary data if we go that route for golf
- Much of the case/offer logic should be re-usable
- `TeamsService.create` would need to inspect the league settings to determine what type of team to create
- `PlayerStatsService.getPlayerProjections` assumes NFL right now; would want to add golf to this (or split the methods so that each sport has one method)
- References like `PlayerPosition` are specific to football right now

## Ideas
- Create a `state` call for a team or team_entry, which gives the current 'position' and maybe the next 'position', then update the UI to make calls to that relatively frequently to determine how it should be rendering things
- Consider class/module structure - does it make sense to create sport-specific services, so that we're keeping the per-sport logic grouped in a logical manner?