import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "../api/auth";
import type { User, LeagueMember, TeamPlayer } from "../types";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

function roundToTwo(number: number | undefined | null): number {
  return number ? Math.round(number * 100) / 100 : 0;
}

interface EntryLineUp {
  RB: (TeamPlayer & { points?: number; pprScore?: number }) | null;
  WR: (TeamPlayer & { points?: number; pprScore?: number }) | null;
  finalScore?: number | null;
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
}

const Entries: React.FC<EntriesProps> = ({ leagueId, season, week }) => {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<FullMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentNflWeek, setCurrentNflWeek] = useState<number | null>(null);
  const [currentNflSeason, setCurrentNflSeason] = useState<number | null>(null);

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

        const [teamsRes, membersRes, rbProjRes, wrProjRes, stateRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}/teams?season=${season}&week=${week}`, { credentials: "include" }),
          fetch(`${API_BASE}/leagues/${leagueId}/users`, { credentials: "include" }),
          fetch(`${API_BASE}/players/projections/${season}/${week}/RB`, { credentials: "include" }),
          fetch(`${API_BASE}/players/projections/${season}/${week}/WR`, { credentials: "include" }),
          fetch(`${API_BASE}/sleeper/state`, { credentials: "include" }),
        ]);

        if (!teamsRes.ok) throw new Error(`Failed to load league teams (status ${teamsRes.status})`);
        if (!membersRes.ok) throw new Error(`Failed to load league members (status ${membersRes.status})`);

        const teamsData = await teamsRes.json();
        const membersData: LeagueMember[] = await membersRes.json();

        const rbProjections = new Map<string, number>();
        const wrProjections = new Map<string, number>();

        try {
          if (rbProjRes.ok) {
            const rbData = await rbProjRes.json();
            if (Array.isArray(rbData)) {
              rbData.forEach((entry: any) => {
                const id = entry.playerId;
                const pts = entry.projectedPoints ?? 0;
                if (id) rbProjections.set(String(id), pts);
              });
            }
          } else {
            console.warn(`Failed to load RB projections (status ${rbProjRes.status})`);
          }
        } catch (e) {
          console.error("Error processing RB projections", e);
        }

        try {
          if (wrProjRes.ok) {
            const wrData = await wrProjRes.json();
            if (Array.isArray(wrData)) {
              wrData.forEach((entry: any) => {
                const id = entry.playerId;
                const pts = entry.projectedPoints ?? 0;
                if (id) wrProjections.set(String(id), pts);
              });
            }
          } else {
            console.warn(`Failed to load WR projections (status ${wrProjRes.status})`);
          }
        } catch (e) {
          console.error("Error processing WR projections", e);
        }

        if (cancelled) return;

        let stateWeekNumber: number | null = null;
        let seasonNumber: number | null = null;
        try {
          if (stateRes.ok) {
            const sleeperState = await stateRes.json();
            if (sleeperState) {
              const currentWeek = sleeperState.week ?? null;
              const currentSeason = sleeperState.season ?? null;
              if (currentWeek != null) stateWeekNumber = Number(currentWeek);
              if (currentSeason != null) seasonNumber = Number(currentSeason);
            }
          } else {
            console.warn(`Failed to load Sleeper state (status ${stateRes.status})`);
          }
        } catch (e) {
          console.error("Error processing Sleeper state", e);
        }

        if (!cancelled && stateWeekNumber != null) setCurrentNflWeek(stateWeekNumber);
        if (!cancelled && seasonNumber != null) setCurrentNflSeason(seasonNumber);

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

            const rb = team.players?.find((p: any) => p.position === 'RB') || null;
            const wr = team.players?.find((p: any) => p.position === 'WR') || null;

            const rbId = rb?.playerId ?? null;
            const wrId = wr?.playerId ?? null;

            const rbProjection = rbId ? rbProjections.get(String(rbId)) ?? 0 : 0;
            const wrProjection = wrId ? wrProjections.get(String(wrId)) ?? 0 : 0;

            const rbWithProjection = rb ? { ...rb, points: rbProjection } : null;
            const wrWithProjection = wr ? { ...wr, points: wrProjection } : null;

            const finalScore = team.finalScore ?? team.result?.finalScore ?? null;

            return {
              ...team,
              name: member?.user?.name,
              email: member?.user?.email,
              lineUp: { RB: rbWithProjection, WR: wrWithProjection, finalScore },
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

  const projectedTotal = (entry: Entry) =>
    (entry.lineUp?.RB?.points ?? 0) + (entry.lineUp?.WR?.points ?? 0);

  const calculateScores = useCallback(async () => {
    if (!entries || entries.length === 0) return;
    try {
      const rbUrl = `${API_BASE}/players/stats/${season}/${week}/RB`;
      const wrUrl = `${API_BASE}/players/stats/${season}/${week}/WR`;
      const [rbResponse, wrResponse] = await Promise.all([
        fetch(rbUrl, { credentials: "include" }),
        fetch(wrUrl, { credentials: "include" }),
      ]);

      if (!rbResponse.ok || !wrResponse.ok) throw new Error("Failed to load Sleeper stats");

      const rbJson = await rbResponse.json();
      const wrJson = await wrResponse.json();
      const finalStats = [...rbJson, ...wrJson];

      const updatedEntries = entries.map((entry) => {
        const rbId = entry.lineUp?.RB?.playerId;
        const wrId = entry.lineUp?.WR?.playerId;
        const rb = finalStats.find((p: any) => p.playerId === rbId);
        const wr = finalStats.find((p: any) => p.playerId === wrId);
        const rbScore = rb?.points ? rb.points : 0.0;
        const wrScore = wr?.points ? wr.points : 0.0;
        const finalScore = rbScore + wrScore;

        return {
          ...entry,
          lineUp: {
            ...entry.lineUp,
            RB: { ...(entry.lineUp?.RB ?? {}), pprScore: rbScore },
            WR: { ...(entry.lineUp?.WR ?? {}), pprScore: wrScore },
            finalScore,
          },
          finalScore,
        };
      });

      setEntries(updatedEntries);
      console.warn("Score calculation updated entries locally; backend persistence for entries has not been implemented yet.");
    } catch (err: any) {
      console.error("Failed to calculate scores", err);
      setError(err?.message ?? "Failed to calculate scores");
    }
  }, [entries, season, week]);

  useEffect(() => {
    if (!showResults) return;
    if (!entries || entries.length === 0) return;
    const needsScores = entries.some((entry) => typeof entry.finalScore !== "number");
    if (!needsScores) return;
    void calculateScores();
  }, [showResults, entries, calculateScores]);

  function ResultsTable({ entries }: { entries: Entry[] }) {
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
              <tr key={entry.teamId || entry.name || entry.email} className="odd:bg-[#3a465b]/20">
                <td className="p-2 border-b border-[#3a465b]">{memberLabel(entry.name || entry.email)}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.RB?.playerName ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.pprScore) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.WR?.playerName ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.pprScore) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(projectedTotal(entry))}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.finalScore ? roundToTwo(entry.finalScore) : ""}</td>
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
              <tr key={entry.teamId || entry.name || entry.email} className="odd:bg-[#3a465b]/20">
                <td className="p-2 border-b border-[#3a465b]">{memberLabel(entry.name || entry.email)}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.RB?.playerName ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.WR?.playerName ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(projectedTotal(entry))}</td>
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
