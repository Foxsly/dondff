import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../api/auth";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NX_API_BASE ||
  "http://localhost:3001";

function roundToTwo(number) {
  return Math.round(number * 100) / 100;
}

const Entries = ({ leagueId, season, week, actualWeek }) => {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedUids, setSelectedUids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setLoading(true);

        // Load current user from backend-backed auth
        try {
          const current = await getCurrentUser();
          if (!cancelled) {
            setUser(current);
          }
        } catch (err) {
          console.error("Failed to load current user", err);
          if (!cancelled) {
            setUser(null);
          }
        }

        if (!leagueId || !season || !week) {
          return;
        }

        // Use existing backend functionality:
        // - LeaguesController.getLeagueTeams => GET /leagues/:id/teams
        // - TeamsController.findOne         => GET /teams/:id
        // - LeaguesController.findLeagueUsers => GET /leagues/:id/users
        const [teamsRes, membersRes, rbProjRes, wrProjRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}/teams`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/leagues/${leagueId}/users`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/sleeper/projections/${season}/${week}?position=RB`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/sleeper/projections/${season}/${week}?position=WR`, {
            credentials: "include",
          }),
        ]);

        if (!teamsRes.ok) {
          throw new Error(
            `Failed to load league teams (status ${teamsRes.status})`
          );
        }
        if (!membersRes.ok) {
          throw new Error(
            `Failed to load league members (status ${membersRes.status})`
          );
        }

        const teamsData = await teamsRes.json();
        const membersData = await membersRes.json();

        let rbProjections = new Map();
        let wrProjections = new Map();

        try {
          if (rbProjRes.ok) {
            const rbData = await rbProjRes.json();
            if (Array.isArray(rbData)) {
              rbData.forEach((entry) => {
                const id = entry.player_id || entry.player?.player_id;
                const pts = entry.stats?.pts_ppr ?? 0;
                if (id) {
                  rbProjections.set(String(id), pts);
                }
              });
            }
          } else {
            console.warn(
              `Failed to load RB projections (status ${rbProjRes.status})`
            );
          }
        } catch (e) {
          console.error("Error processing RB projections", e);
        }

        try {
          if (wrProjRes.ok) {
            const wrData = await wrProjRes.json();
            if (Array.isArray(wrData)) {
              wrData.forEach((entry) => {
                const id = entry.player_id || entry.player?.player_id;
                const pts = entry.stats?.pts_ppr ?? 0;
                if (id) {
                  wrProjections.set(String(id), pts);
                }
              });
            }
          } else {
            console.warn(
              `Failed to load WR projections (status ${wrProjRes.status})`
            );
          }
        } catch (e) {
          console.error("Error processing WR projections", e);
        }

        if (cancelled) return;

        setMembers(Array.isArray(membersData) ? membersData : []);

        const allTeams = Array.isArray(teamsData) ? teamsData : [];

        // Filter to teams that belong to this league + season + week
        // using the concrete ITeam shape:
        //   teamId: string;
        //   leagueId: string;
        //   userId: string;
        //   seasonYear: number;
        //   week: number;
        const filteredTeams = allTeams.filter((team) => {
          const matchesLeague =
            team.leagueId &&
            String(team.leagueId) === String(leagueId);

          const matchesSeason =
            season != null &&
            season !== "" &&
            Number(team.seasonYear) === Number(season);

          const matchesWeek =
            week != null &&
            week !== "" &&
            Number(team.week) === Number(week);

          return matchesLeague && matchesSeason && matchesWeek;
        });

        // For each filtered team, call TeamsController.findOne to get full details.
        const detailedTeams = await Promise.all(
          filteredTeams.map(async (team) => {
            const teamId = team.id || team.teamId || team.team_id;
            if (!teamId) return team;

            try {
              const res = await fetch(`${API_BASE}/teams/${teamId}`, {
                credentials: "include",
              });
              if (!res.ok) {
                console.warn(
                  `Failed to load team details for ${teamId} (status ${res.status})`
                );
                return team;
              }
              const fullTeam = await res.json();
              return fullTeam || team;
            } catch (err) {
              console.error(
                `Error loading team details for ${teamId}`,
                err
              );
              return team;
            }
          })
        );

        // Derive "entries" from teams. We treat each team as a weekly entry.
        const derivedEntries = await Promise.all(detailedTeams.map(async (team) => {
          const memberRes = await fetch(`${API_BASE}/users/${team.userId}`, {
            credentials: "include",
          });
          const member = await memberRes.json();
          const ownerEmail =
            member.name ||
            null;

          // Try to infer a lineup shape similar to the old Firestore docs
          //TODO this won't exist?
          const lineupSource =
            team.lineUp ||
            team.lineup ||
            team.lineupState ||
            team.entry ||
            {};

          const rb = team.players.find(player => player.position === 'RB') || null;
          const wr = team.players.find(player => player.position === 'WR') || null;

          const rbId =
            (rb && (rb.playerId)) || null;
          const wrId =
            (wr && (wr.playerId)) || null;

          const rbProjection = rbId
            ? rbProjections.get(String(rbId)) ?? 0
            : 0;
          const wrProjection = wrId
            ? wrProjections.get(String(wrId)) ?? 0
            : 0;

          const rbWithProjection = rb
            ? {...rb, points: rbProjection}
            : null;
          const wrWithProjection = wr
            ? {...wr, points: wrProjection}
            : null;

          const finalScore =
            team.finalScore ??
            team.result?.finalScore ??
            lineupSource.finalScore ??
            null;

          return {
            id: team.id || team.teamId || team.team_id || ownerEmail,
            name: ownerEmail,
            email: ownerEmail,
            lineUp: {
              RB: rbWithProjection,
              WR: wrWithProjection,
              finalScore,
            },
            finalScore,
          };
        }));

        setEntries(derivedEntries);
      } catch (err) {
        console.error("Failed to load entries", err);
        if (!cancelled) {
          setError(
            err && err.message ? err.message : "Failed to load entries"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [leagueId, season, week]);

  const memberLabel = (email) => {
    const member = members?.find(
      (m) =>
        m.email === email ||
        m.userEmail === email ||
        m.uid === email
    );
    return (
      member?.displayName ||
      member?.name ||
      member?.email ||
      email
    );
  };

  const membersWithEntries = new Set(
    (entries ?? []).map(
      (entry) => entry.name || entry.userEmail || entry.email
    )
  );
  const unplayedMembers =
    members?.filter((member) => {
      const key = member.email || member.userEmail || member.uid;
      return key && !membersWithEntries.has(key);
    }) ?? [];

  const hasEntry = !!(entries ?? []).some(
    (entry) =>
      (entry.name || entry.userEmail || entry.email) === user?.email
  );

  const currentMember =
    members?.find(
      (member) =>
        member.email === user?.email ||
        member.userEmail === user?.email
    ) ?? null;
  const isAdmin = currentMember?.role === "admin";

  const toggleUid = (uid) => {
    setSelectedUids((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  };

  const sortedEntries = entries
    ? [...entries].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    : [];

  const weekNum = Number(week);
  const actualWeekNum = Number(actualWeek);
  const isCurrentWeek = weekNum === actualWeekNum;

  const allHaveFinal =
    (entries ?? []).length > 0 &&
    (entries ?? []).every(
      (e) => typeof e?.finalScore === "number"
    );

  const showResults = !isCurrentWeek && allHaveFinal;

  function logStuff () {
    console.log(entries);
    console.log(hasEntry);
    console.log(user);
  }

  const projectedTotal = (entry) =>
    (entry.lineUp?.RB?.points ?? 0) + (entry.lineUp?.WR?.points ?? 0);

  const calculateScores = async () => {
    if (!entries || entries.length === 0) return;
    try {
      const rbUrl = `${API_BASE}/sleeper/stats/${season}/${week}?position=RB`;
      const wrUrl = `${API_BASE}/sleeper/stats/${season}/${week}?position=WR`;
      const [rbResponse, wrResponse] = await Promise.all([
        fetch(rbUrl, { credentials: "include" }),
        fetch(wrUrl, { credentials: "include" }),
      ]);

      if (!rbResponse.ok || !wrResponse.ok) {
        throw new Error("Failed to load Sleeper stats");
      }

      const rbJson = await rbResponse.json();
      const wrJson = await wrResponse.json();
      const finalStats = [...rbJson, ...wrJson];

      const updatedEntries = entries.map((entry) => {
        const rbId = entry.lineUp?.RB?.playerId;
        const wrId = entry.lineUp?.WR?.playerId;
        const rb = finalStats.find(
          (player) => player.player_id === rbId
        );
        const wr = finalStats.find(
          (player) => player.player_id === wrId
        );

        const rbScore =
          rb && rb.stats?.pts_ppr ? rb.stats.pts_ppr : 0.0;
        const wrScore =
          wr && wr.stats?.pts_ppr ? wr.stats.pts_ppr : 0.0;

        const newLineup = {
          ...entry.lineUp,
          RB: {
            ...(entry.lineUp?.RB ?? {}),
            pprScore: rbScore,
          },
          WR: {
            ...(entry.lineUp?.WR ?? {}),
            pprScore: wrScore,
          },
        };

        const finalScore = rbScore + wrScore;

        return {
          ...entry,
          lineUp: {
            ...newLineup,
            finalScore,
          },
          finalScore,
        };
      });

      // Update local state only; backend persistence will be added later.
      setEntries(updatedEntries);
      console.warn(
        "Score calculation updated entries locally; backend persistence for entries has not been implemented yet."
      );
    } catch (err) {
      console.error("Failed to calculate scores", err);
      setError(
        err && err.message
          ? err.message
          : "Failed to calculate scores"
      );
    }
  };

  function ResultsTable({ entries }) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border border-[#3a465b]">
          <thead className="bg-[#3a465b]">
          <tr>
            <th className="p-2 border-b border-[#3a465b]">Member</th>
            <th className="p-2 border-b border-[#3a465b]">RB</th>
            <th className="p-2 border-b border-[#3a465b]">RB Projection</th>
            <th className="p-2 border-b border-[#3a465b]">RB Final</th>
            <th className="p-2 border-b border-[#3a465b]">WR</th>
            <th className="p-2 border-b border-[#3a465b]">WR Projection</th>
            <th className="p-2 border-b border-[#3a465b]">WR Final</th>
            <th className="p-2 border-b border-[#3a465b]">Projected Total</th>
            <th className="p-2 border-b border-[#3a465b]">Final Score</th>
          </tr>
          </thead>
          <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id || entry.name || entry.email}
              className="odd:bg-[#3a465b]/20"
            >
              <td className="p-2 border-b border-[#3a465b]">
                {memberLabel(entry.name || entry.email)}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {entry.lineUp?.RB?.name ?? ""}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.RB?.points) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.RB?.pprScore) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {entry.lineUp?.WR?.name ?? ""}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.WR?.points) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.WR?.pprScore) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(projectedTotal(entry))}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {entry.finalScore
                  ? roundToTwo(entry.finalScore)
                  : ""}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    );
  }

  function ProjectionsTable({ entries }) {
    console.log(entries);
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border border-[#3a465b]">
          <thead className="bg-[#3a465b]">
          <tr>
            <th className="p-2 border-b border-[#3a465b]">Member</th>
            <th className="p-2 border-b border-[#3a465b]">RB</th>
            <th className="p-2 border-b border-[#3a465b]">RB Projection</th>
            <th className="p-2 border-b border-[#3a465b]">WR</th>
            <th className="p-2 border-b border-[#3a465b]">WR Projection</th>
            <th className="p-2 border-b border-[#3a465b]">Projected Total</th>
          </tr>
          </thead>
          <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id || entry.name || entry.email}
              className="odd:bg-[#3a465b]/20"
            >
              <td className="p-2 border-b border-[#3a465b]">
                {memberLabel(entry.name || entry.email)}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {entry.lineUp?.RB?.playerName ?? ""}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.RB?.points) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {entry.lineUp?.WR?.playerName ?? ""}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.WR?.points) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(projectedTotal(entry))}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p>Loading entries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showResults ? (
        <ResultsTable entries={sortedEntries} />
      ) : (
        <ProjectionsTable entries={sortedEntries} />
      )}
      {logStuff()}
      {entries &&
        // entries.length > 0 &&
        !hasEntry &&
        user && (
          <Link
            to="/game/setting-lineups"
            state={{
              leagueId: leagueId,
              season: season,
              week: week,
            }}
          >
            <button className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80">
              Play Game
            </button>
          </Link>
        )}
      {isAdmin && unplayedMembers.length > 0 && (
        <>
          <div className="space-y-4">
            {unplayedMembers.map((member) => (
              <div key={member.email || member.userEmail}>
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={() =>
                    toggleUid(member.email || member.userEmail)
                  }
                />
                {member.email || member.userEmail}
              </div>
            ))}
            <Link
              to="/game/group"
              state={{
                leagueId: leagueId,
                season: season,
                week: week,
                participants: selectedUids,
              }}
            >
              <button
                className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80 disabled:opacity-50"
                disabled={selectedUids.length === 0}
              >
                Start Group Game
              </button>
            </Link>
          </div>
        </>
      )}
      {actualWeek > parseInt(week, 10) && isAdmin && (
        <button
          className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
          onClick={calculateScores}
        >
          Calculate Scores
        </button>
      )}
    </div>
  );
};

export default Entries;
