import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../api/auth";
import { getPositionDisplayName } from "./util";
import type { User, LeagueMember, TeamPlayer, SportLeague, LeaguePosition } from "../types";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

function roundToTwo(number: number | undefined | null): number {
  return number ? Math.round(number * 100) / 100 : 0;
}

interface EntryPlayer extends TeamPlayer {
  points?: number;
  pprScore?: number;
}

interface EntryLineUp {
  [position: string]: EntryPlayer | null;
  finalScore?: any;
}

interface Entry {
  teamId: string;
  userId: string;
  name?: string;
  email?: string;
  lineUp: EntryLineUp;
  finalScore?: number | null;
  playable?: boolean;
  [key: string]: any;
}

interface FullMember extends LeagueMember {
  user: User & { name?: string; email?: string };
}

interface EntriesProps {
  leagueId: string;
  season: string | number;
  week: string | number;
  actualWeek?: number | null;
  sportLeague?: SportLeague;
}

const Entries: React.FC<EntriesProps> = ({ leagueId, season, week, sportLeague }) => {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [positions, setPositions] = useState<LeaguePosition[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<FullMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentNflWeek, setCurrentNflWeek] = useState<number | null>(null);
  const [currentNflSeason, setCurrentNflSeason] = useState<number | null>(null);

  const isGolf = sportLeague === 'GOLF';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setLoading(true);

        try {
          const current = await getCurrentUser();
          if (!cancelled) setUser(current);
        } catch (err) {
          console.error("Failed to load current user", err);
          if (!cancelled) setUser(null);
        }

        if (!leagueId || !season || !week) return;

        // Fetch positions for this league
        const [teamsRes, membersRes, positionsRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}/teams?season=${season}&week=${week}`, { credentials: "include" }),
          fetch(`${API_BASE}/leagues/${leagueId}/users`, { credentials: "include" }),
          fetch(`${API_BASE}/leagues/${leagueId}/positions`, { credentials: "include" }),
        ]);

        if (!teamsRes.ok) throw new Error(`Failed to load league teams (status ${teamsRes.status})`);
        if (!membersRes.ok) throw new Error(`Failed to load league members (status ${membersRes.status})`);

        const teamsData = await teamsRes.json();
        const membersData: LeagueMember[] = await membersRes.json();

        let leaguePositions: LeaguePosition[] = [];
        if (positionsRes.ok) {
          leaguePositions = await positionsRes.json();
        }
        if (leaguePositions.length === 0) {
          // Fallback to NFL defaults
          leaguePositions = [
            { leagueSettingsId: '', position: 'RB', poolSize: 64 },
            { leagueSettingsId: '', position: 'WR', poolSize: 96 },
          ];
        }
        setPositions(leaguePositions);

        // Fetch projections for each position
        const projectionsByPosition = new Map<string, Map<string, number>>();
        if (isGolf) {
          // For golf, all positions share the same player pool — fetch once
          try {
            const res = await fetch(`${API_BASE}/players/projections/${season}/${week}/${leaguePositions[0].position}`, { credentials: "include" });
            if (res.ok) {
              const data = await res.json();
              const map = new Map<string, number>();
              if (Array.isArray(data)) {
                data.forEach((entry: any) => {
                  if (entry.playerId) map.set(String(entry.playerId), entry.projectedPoints ?? 0);
                });
              }
              // Reuse the same projection map for all golf positions
              for (const pos of leaguePositions) {
                projectionsByPosition.set(pos.position, map);
              }
            }
          } catch (e) {
            console.error("Error processing golf projections", e);
          }
        } else {
          // For NFL, fetch projections per position
          const projectionPromises = leaguePositions.map((pos) =>
            fetch(`${API_BASE}/players/projections/${season}/${week}/${pos.position}`, { credentials: "include" })
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  const map = new Map<string, number>();
                  if (Array.isArray(data)) {
                    data.forEach((entry: any) => {
                      if (entry.playerId) map.set(String(entry.playerId), entry.projectedPoints ?? 0);
                    });
                  }
                  projectionsByPosition.set(pos.position, map);
                }
              })
              .catch((e) => console.error(`Error processing ${pos.position} projections`, e))
          );
          await Promise.all(projectionPromises);
        }

        if (cancelled) return;

        // Fetch current state (NFL only)
        if (!isGolf) {
          try {
            const stateRes = await fetch(`${API_BASE}/sleeper/state`, { credentials: "include" });
            if (stateRes.ok) {
              const sleeperState = await stateRes.json();
              if (sleeperState) {
                const currentWeek = sleeperState.week ?? null;
                const currentSeason = sleeperState.season ?? null;
                if (currentWeek != null && !cancelled) setCurrentNflWeek(Number(currentWeek));
                if (currentSeason != null && !cancelled) setCurrentNflSeason(Number(currentSeason));
              }
            }
          } catch (e) {
            console.error("Error processing Sleeper state", e);
          }
        } else {
          // For golf, treat current year/week as always current
          if (!cancelled) {
            setCurrentNflSeason(Number(season));
            setCurrentNflWeek(Number(week));
          }
        }

        const fullMembers: FullMember[] = await Promise.all(
          membersData.map(async (leagueMember) => {
            const memberRes = await fetch(`${API_BASE}/users/${leagueMember.userId}`, { credentials: "include" });
            const member = await memberRes.json();
            return { ...leagueMember, user: member } as FullMember;
          })
        );

        setMembers(fullMembers);

        const teams = Array.isArray(teamsData) ? teamsData : [];

        const derivedEntries: Entry[] = await Promise.all(
          teams.map(async (team: any) => {
            const member = fullMembers.find((u) => u.userId === team.userId);
            const teamStatusResponse = await fetch(`${API_BASE}/teams/${team.teamId}/status`, { credentials: "include" });
            const teamStatus = await teamStatusResponse.json();

            const lineUp: EntryLineUp = {};
            for (const pos of leaguePositions) {
              const player = team.players?.find((p: any) => p.position === pos.position) || null;
              if (player) {
                const projMap = projectionsByPosition.get(pos.position);
                const projection = projMap ? (projMap.get(String(player.playerId)) ?? 0) : 0;
                lineUp[pos.position] = { ...player, points: projection };
              } else {
                lineUp[pos.position] = null;
              }
            }

            const finalScore = team.finalScore ?? team.result?.finalScore ?? null;

            return {
              ...team,
              name: member?.user?.name,
              email: member?.user?.email,
              lineUp: { ...lineUp, finalScore },
              finalScore,
              playable: teamStatus.playable,
            };
          })
        );

        setEntries(derivedEntries);
      } catch (err: any) {
        console.error("Failed to load entries", err);
        if (!cancelled) setError(err?.message ?? "Failed to load entries");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [leagueId, season, week]);

  const memberLabel = (email: string | undefined) => {
    const member = members?.find(
      (m) => m.email === email || m.user?.email === email
    );
    return member?.user?.name || member?.name || member?.email || email;
  };

  const membersWithPlayedEntries = new Set(
    (entries ?? []).filter((entry) => !entry.playable).map((entry) => entry.userId)
  );

  const playersWithPlayableEntries =
    members?.filter((member) => member.userId && !membersWithPlayedEntries.has(member.userId)) ?? [];

  const isEntryPlayable = entries.length === 0 || entries.some(
    (entry) => !(entry.name === user?.name && !entry.playable)
  );

  const currentMember = members?.find((member) => member.userId === user?.userId) ?? null;
  const isAdmin = currentMember?.role === "admin";

  const toggleSelectedMember = (member: FullMember) => {
    setSelectedMembers((currentlySelectedMembers) =>
      currentlySelectedMembers.some((s) => s.userId === member.userId)
        ? currentlySelectedMembers.filter((s) => s.userId !== member.userId)
        : [...currentlySelectedMembers, member]
    );
    console.log('Selected', selectedMembers);
  };

  const sortedEntries = entries ? [...entries].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)) : [];

  const weekNum = Number(week);
  const seasonNum = Number(season);
  const isPastWeek = currentNflWeek != null && weekNum < currentNflWeek;
  const isCurrentWeek = currentNflWeek != null && weekNum === currentNflWeek;
  const isPastSeason = currentNflSeason != null && seasonNum < currentNflSeason;
  const isCurrentSeason = currentNflSeason != null && seasonNum === currentNflSeason;
  const showResults = isPastWeek && (isCurrentSeason || isPastSeason);

  const projectedTotal = (entry: Entry) => {
    let total = 0;
    for (const pos of positions) {
      const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
      total += player?.points ?? 0;
    }
    return total;
  };

  const calculateScores = useCallback(async () => {
    if (!entries || entries.length === 0 || isGolf) return;
    try {
      const statsPromises = positions.map((pos) =>
        fetch(`${API_BASE}/players/stats/${season}/${week}/${pos.position}`, { credentials: "include" })
          .then((res) => res.ok ? res.json() : [])
      );
      const allStats = await Promise.all(statsPromises);
      const finalStats = allStats.flat();

      const updatedEntries = entries.map((entry) => {
        let finalScore = 0;
        const updatedLineUp: EntryLineUp = { ...entry.lineUp };

        for (const pos of positions) {
          const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
          if (player?.playerId) {
            const stat = finalStats.find((p: any) => p.playerId === player.playerId);
            const score = stat?.points ?? 0;
            finalScore += score;
            updatedLineUp[pos.position] = { ...player, pprScore: score };
          }
        }

        updatedLineUp.finalScore = finalScore;
        return { ...entry, lineUp: updatedLineUp, finalScore };
      });

      setEntries(updatedEntries);
    } catch (err: any) {
      console.error("Failed to calculate scores", err);
      setError(err?.message ?? "Failed to calculate scores");
    }
  }, [entries, season, week, positions, isGolf]);

  useEffect(() => {
    if (!showResults) return;
    if (!entries || entries.length === 0) return;
    const needsScores = entries.some((entry) => typeof entry.finalScore !== "number");
    if (!needsScores) return;
    void calculateScores();
  }, [showResults, entries, calculateScores]);

  const thClass = "p-2 border-b border-[#3a465b]";
  const tdClass = "p-2 border-b border-[#3a465b]";

  function ResultsTable({ entries }: { entries: Entry[] }) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border border-[#3a465b]">
          <thead className="bg-[#3a465b]">
            <tr>
              <th className={thClass}>Member</th>
              {positions.map((pos) => (
                <React.Fragment key={pos.position}>
                  <th className={thClass}>{getPositionDisplayName(pos.position, sportLeague)}</th>
                  <th className={thClass}>{getPositionDisplayName(pos.position, sportLeague)} Proj</th>
                  <th className={thClass}>{getPositionDisplayName(pos.position, sportLeague)} Final</th>
                </React.Fragment>
              ))}
              <th className={thClass}>Projected Total</th>
              <th className={thClass}>Final Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.teamId || entry.name || entry.email} className="odd:bg-[#3a465b]/20">
                <td className={tdClass}>{memberLabel(entry.name || entry.email)}</td>
                {positions.map((pos) => {
                  const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
                  return (
                    <React.Fragment key={pos.position}>
                      <td className={tdClass}>{player?.playerName ?? ""}</td>
                      <td className={tdClass}>{roundToTwo(player?.points)}</td>
                      <td className={tdClass}>{roundToTwo(player?.pprScore)}</td>
                    </React.Fragment>
                  );
                })}
                <td className={tdClass}>{roundToTwo(projectedTotal(entry))}</td>
                <td className={tdClass}>{entry.finalScore ? roundToTwo(entry.finalScore) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function ProjectionsTable({ entries }: { entries: Entry[] }) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border border-[#3a465b]">
          <thead className="bg-[#3a465b]">
            <tr>
              <th className={thClass}>Member</th>
              {positions.map((pos) => (
                <React.Fragment key={pos.position}>
                  <th className={thClass}>{getPositionDisplayName(pos.position, sportLeague)}</th>
                  <th className={thClass}>{getPositionDisplayName(pos.position, sportLeague)} Proj</th>
                </React.Fragment>
              ))}
              <th className={thClass}>Projected Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.teamId || entry.name || entry.email} className="odd:bg-[#3a465b]/20">
                <td className={tdClass}>{memberLabel(entry.name || entry.email)}</td>
                {positions.map((pos) => {
                  const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
                  return (
                    <React.Fragment key={pos.position}>
                      <td className={tdClass}>{player?.playerName ?? ""}</td>
                      <td className={tdClass}>{roundToTwo(player?.points)}</td>
                    </React.Fragment>
                  );
                })}
                <td className={tdClass}>{roundToTwo(projectedTotal(entry))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) return <div className="space-y-4"><p>Loading entries...</p></div>;
  if (error) return <div className="space-y-4"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="space-y-4">
      {showResults ? (
        <ResultsTable entries={sortedEntries} />
      ) : (
        <ProjectionsTable entries={sortedEntries} />
      )}
      {isCurrentSeason && isCurrentWeek && entries && isEntryPlayable && user && (
        <Link to="/game/setting-lineups" state={{ leagueId, season, week }}>
          <button className="btn-primary">Play Game</button>
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
                  onChange={() => toggleSelectedMember(member)}
                />
                {member.user.name}
              </div>
            ))}
            <Link to="/game/group" state={{ leagueId, season, week, participants: selectedMembers }}>
              <button className="btn-primary" disabled={selectedMembers.length === 0}>
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
