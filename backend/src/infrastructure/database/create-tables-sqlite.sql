-- USER table
CREATE TABLE user (
                      userId   TEXT PRIMARY KEY, -- UUID
                      name     TEXT NOT NULL,
                      email    TEXT NOT NULL UNIQUE
);

-- LEAGUE table
CREATE TABLE league (
                        leagueId TEXT PRIMARY KEY, -- UUID
                        name     TEXT NOT NULL
);

-- TEAM table
CREATE TABLE team (
                      teamId     TEXT PRIMARY KEY, -- UUID
                      leagueId   TEXT NOT NULL,
                      userId     TEXT NOT NULL,
                      seasonYear INTEGER NOT NULL,
                      week       INTEGER NOT NULL,
                      FOREIGN KEY (leagueId) REFERENCES league(leagueId) ON DELETE CASCADE,
                      FOREIGN KEY (userId) REFERENCES user(userId) ON DELETE CASCADE
);

-- TEAMPLAYER table (composite PK - teamId & position)
CREATE TABLE teamPlayer (
                            teamId     TEXT NOT NULL,
                            position   TEXT NOT NULL,
                            playerId   INTEGER NOT NULL,
                            playerName TEXT NOT NULL,
                            PRIMARY KEY (teamId, position),
                            FOREIGN KEY (teamId) REFERENCES team(teamId) ON DELETE CASCADE
);

-- LEAGUEUSER (junction table for memberships - composite PK, userId & leagueId)
CREATE TABLE leagueUser (
                            userId   TEXT NOT NULL,
                            leagueId TEXT NOT NULL,
                            role     TEXT NOT NULL,
                            PRIMARY KEY (userId, leagueId),
                            FOREIGN KEY (userId) REFERENCES user(userId) ON DELETE CASCADE,
                            FOREIGN KEY (leagueId) REFERENCES league(leagueId) ON DELETE CASCADE
);
