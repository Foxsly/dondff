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


## LEAGUE_SETTINGS
```
                                                          Table "public.league_settings"
       Column       |            Type             | Collation | Nullable |      Default      | Storage  | Compression | Stats target | Description
--------------------+-----------------------------+-----------+----------+-------------------+----------+-------------+--------------+-------------
 league_settings_id | uuid                        |           | not null |                   | plain    |             |              |
 league_id          | uuid                        |           | not null |                   | plain    |             |              |
 scoring_type       | text                        |           | not null |                   | extended |             |              |
 positions          | text                        |           | not null |                   | extended |             |              |
 rb_pool_size       | integer                     |           | not null | 0                 | plain    |             |              |
 wr_pool_size       | integer                     |           | not null | 0                 | plain    |             |              |
 qb_pool_size       | integer                     |           | not null | 0                 | plain    |             |              |
 te_pool_size       | integer                     |           | not null | 0                 | plain    |             |              |
 created_at         | timestamp without time zone |           | not null | CURRENT_TIMESTAMP | plain    |             |              |
 updated_at         | timestamp without time zone |           | not null | CURRENT_TIMESTAMP | plain    |             |              |
Indexes:
    "league_settings_pkey" PRIMARY KEY, btree (league_settings_id)
    "ix_league_settings_league_created" btree (league_id, created_at)
Referenced by:
    TABLE "team_entry" CONSTRAINT "team_entry_league_settings_id_fkey" FOREIGN KEY (league_settings_id) REFERENCES league_settings(league_settings_id) ON DELETE RESTRICT
Access method: heap
```
#### Modify LEAGUE_SETTINGS
- drop *_pool_size tables
- add `sport_league` column
  - NFL, PGA, NBA, NHL, MLB, etc
#### Create LEAGUE_SETTINGS_POSITION
- league_settings_id
- position
- pool_size
- created_at
- updated_at
- Composite PK - league_settings_id, position
- UPSERT table