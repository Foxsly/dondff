import React, {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {getCurrentUser} from "../api/auth";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

function roundToTwo(number) {
  return number ? Math.round(number * 100) / 100 : 0;
}

const Entries = ({leagueId, season, week}) => {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentNflWeek, setCurrentNflWeek] = useState(null);
  const [currentNflSeason, setCurrentNflSeason] = useState(null);

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
        // - TeamsController.findOne            => GET /teams/:id
        // - LeaguesController.findLeagueUsers  => GET /leagues/:id/users
        // - SleeperController.getState         => GET /sleeper/state
        // - TeamsController.getTeamStatus      => GET /teams/:teamId/status
        const [
          teamsRes,
          membersRes,
          rbProjRes,
          wrProjRes,
          stateRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}/teams?season=${season}&week=${week}`, {
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
          fetch(`${API_BASE}/sleeper/state`, {
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

        // Inspect Sleeper state to understand the "current" NFL week so we can
        // decide when to show final scores instead of projections.
        let stateWeekNumber = null;
        let seasonNumber = null;
        try {
          if (stateRes.ok) {
            const sleeperState = await stateRes.json();
            if (sleeperState) {
              // Be defensive about field names from Sleeper
              const currentWeek = sleeperState.week ?? null;
              const currentSeason = sleeperState.season ?? null;

              if (currentWeek != null) {
                stateWeekNumber = Number(currentWeek);
              }
              if (currentSeason != null) {
                seasonNumber = Number(currentSeason);
              }
            }
          } else {
            console.warn(
              `Failed to load Sleeper state (status ${stateRes.status})`
            );
          }
        } catch (e) {
          console.error("Error processing Sleeper state", e);
        }

        if (!cancelled && stateWeekNumber != null) {
          setCurrentNflWeek(stateWeekNumber);
        }
        if (!cancelled && seasonNumber != null) {
          setCurrentNflSeason(seasonNumber);
        }

        // Build out a more detailed members list
        const fullMembers = await Promise.all(membersData.map(async (leagueMember) => {
          const memberRes = await fetch(`${API_BASE}/users/${leagueMember.userId}`, {
            credentials: "include",
          });
          const member = await memberRes.json();
          return {
            ...leagueMember,
            user: member
          }
        }));

        setMembers(fullMembers);

        const teams = Array.isArray(teamsData) ? teamsData : [];

        // Derive "entries" from teams. We treat each team as a weekly entry.
        const derivedEntries = await Promise.all(teams.map(async (team) => {
          const member = fullMembers.find(user => user.userId === team.userId);
          const teamStatusResponse = await fetch(`${API_BASE}/teams/${team.teamId}/status`, {credentials: "include"});
          const teamStatus = await teamStatusResponse.json();


          const rb = team.players.find(player => player.position === 'RB') || null;
          const wr = team.players.find(player => player.position === 'WR') || null;

          const rbId = (rb && (rb.playerId)) || null;
          const wrId = (wr && (wr.playerId)) || null;

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
            null;

          return {
            ...team,
            name: member.user.name,
            email: member.user.email,
            lineUp: {
              RB: rbWithProjection,
              WR: wrWithProjection,
              finalScore,
            },
            finalScore,
            playable: teamStatus.playable,
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

  const membersWithPlayedEntries = new Set(
    (entries ?? []).filter((entry) => !entry.playable).map((entry) => entry.userId)
  );

  const playersWithPlayableEntries =
    members?.filter((member) => {
      return member.userId && !membersWithPlayedEntries.has(member.userId);
    }) ?? [];

  const isEntryPlayable = entries.length === 0 || entries.some(
    (entry) =>
      !(entry.name === user?.name && !entry.playable)
  );

  const currentMember = members?.find((member) => member.userId === user?.userId) ?? null;

  const isAdmin = currentMember?.role === "admin";

  const toggleSelectedMember = (member) => {
    // const memberExists = selectedMembers.some((selectedMember) => {return selectedMember.userId === member.userId});
    // if(memberExists) {
    //   setSelectedMembers(selectedMembers.filter((selectedMember) => selectedMember.userId !== member.userId));
    // } else {
    //   setSelectedMembers([...selectedMembers, member]);
    // }

    setSelectedMembers((currentlySelectedMembers) =>
      currentlySelectedMembers.some((selectedMember) => {
        console.log("selectedMember", selectedMember);
        console.log("member", member);
        return selectedMember.userId === member.userId
      })
        ? currentlySelectedMembers.filter((selectedMember) => selectedMember.userId !== member.userId)
        : [...currentlySelectedMembers, member]
    );
    console.log('Selected', selectedMembers);
  };

  const sortedEntries = entries
    ? [...entries].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    : [];

  const weekNum = Number(week);
  const seasonNum = Number(season);
  const isPastWeek =
    currentNflWeek != null && weekNum < currentNflWeek;
  const isCurrentWeek =
    currentNflWeek != null && weekNum === currentNflWeek;
  const isPastSeason = currentNflSeason != null && seasonNum < currentNflSeason;
  const isCurrentSeason = currentNflSeason != null && seasonNum === currentNflSeason;

  const showResults = isPastWeek && (isCurrentSeason || isPastSeason);

  function logStuff() {
    // console.log(entries);
    // console.log(isEntryPlayable);
    // console.log(user);
    // console.log(unplayedMembers);
    // console.log(isAdmin);
    // console.log(members);
    // console.log(week, weekNum, season, seasonNum);
    // console.log(isPastWeek, isCurrentWeek, isPastSeason, isCurrentSeason);
    // console.log(showResults);
  }

  const projectedTotal = (entry) =>
    (entry.lineUp?.RB?.points ?? 0) + (entry.lineUp?.WR?.points ?? 0);

  const calculateScores = useCallback(async () => {
    if (!entries || entries.length === 0) return;
    try {
      const rbUrl = `${API_BASE}/sleeper/stats/${season}/${week}?position=RB`;
      const wrUrl = `${API_BASE}/sleeper/stats/${season}/${week}?position=WR`;
      const [rbResponse, wrResponse] = await Promise.all([
        fetch(rbUrl, {credentials: "include"}),
        fetch(wrUrl, {credentials: "include"}),
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
        const rb = finalStats.find((player) => player.player_id === rbId);
        const wr = finalStats.find((player) => player.player_id === wrId);

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
  }, [entries, season, week]);

  useEffect(() => {
    // When we should be showing results and entries are missing final scores, automatically calculate them.
    if (!showResults) return;
    if (!entries || entries.length === 0) return;

    const needsScores = entries.some(
      (entry) => typeof entry.finalScore !== "number"
    );

    if (!needsScores) return;

    void calculateScores();
  }, [showResults, entries, calculateScores]);

  function ResultsTable({entries}) {
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
                {entry.lineUp?.RB?.playerName ?? ""}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.RB?.points) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {roundToTwo(entry.lineUp?.RB?.pprScore) ?? 0}
              </td>
              <td className="p-2 border-b border-[#3a465b]">
                {entry.lineUp?.WR?.playerName ?? ""}
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

  function ProjectionsTable({entries}) {
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
        <ResultsTable entries={sortedEntries}/>
      ) : (
        <ProjectionsTable entries={sortedEntries}/>
      )}
      {logStuff()}
      {isCurrentSeason && isCurrentWeek && entries && isEntryPlayable && user && (
        <Link
          to="/game/setting-lineups"
          state={{
            leagueId: leagueId,
            season: season,
            week: week,
          }}
        >
          <button className="btn-primary">
            Play Game
          </button>
        </Link>
      )}
      {isAdmin && isCurrentSeason && isCurrentWeek && playersWithPlayableEntries.length > 0 && (
        <>
          <div className="space-y-4">
            {playersWithPlayableEntries.map((member) => (
              <div key={member.user.name}>
                <input
                  type="checkbox"
                  className="mr-2"
                  onChange={() =>
                    toggleSelectedMember(member)
                  }
                />
                {member.user.name}
              </div>
            ))}
            <Link
              to="/game/group"
              state={{
                leagueId: leagueId,
                season: season,
                week: week,
                participants: selectedMembers,
              }}
            >
              <button
                className="btn-primary"
                disabled={selectedMembers.length === 0}
              >
                Start Group Game
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Entries;
