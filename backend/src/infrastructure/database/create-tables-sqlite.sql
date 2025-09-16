-- USER table
CREATE TABLE user (
                      userId     INTEGER PRIMARY KEY,
                      name       TEXT NOT NULL,
                      email      TEXT NOT NULL UNIQUE
);

-- LEAGUE table
CREATE TABLE league (
                        leagueId   INTEGER PRIMARY KEY,
                        name       TEXT NOT NULL
);

-- TEAM table
CREATE TABLE team (
                      teamId     INTEGER PRIMARY KEY AUTOINCREMENT,
                      leagueId   INTEGER NOT NULL,
                      userId     INTEGER NOT NULL,
                      seasonYear INTEGER NOT NULL,
                      week       INTEGER NOT NULL,
                      position   TEXT NOT NULL,
                      playerId   INTEGER NOT NULL,
                      playerName TEXT NOT NULL,
                      FOREIGN KEY (leagueId) REFERENCES league(leagueId) ON DELETE CASCADE,
                      FOREIGN KEY (userId) REFERENCES user(userId) ON DELETE CASCADE
);

-- LEAGUEUSER (junction table for memberships)
CREATE TABLE leagueUser (
                            userId   INTEGER NOT NULL,
                            leagueId INTEGER NOT NULL,
                            role     TEXT NOT NULL,
                            PRIMARY KEY (userId, leagueId),
                            FOREIGN KEY (userId) REFERENCES user(userId) ON DELETE CASCADE,
                            FOREIGN KEY (leagueId) REFERENCES league(leagueId) ON DELETE CASCADE
);
