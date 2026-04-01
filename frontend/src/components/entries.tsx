import React, {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {getCurrentUser} from "../api/auth";
import {getLeagueTeams, getLeagueUsers} from "../api/leagues";
import {getProjections, getStats} from "../api/players";
import * as teamsApi from "../api/teams";
import {getUser} from "../api/users";
import {useLeague} from "../contexts/LeagueContext";
import type {LeagueMember, LeaguePosition, TeamPlayer, User} from "../types";
import LoadingSpinner from "./ui/LoadingSpinner";

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
  eventGroupId: string;
  currentEventGroupId?: string | null;
}

const Entries: React.FC<EntriesProps> = ({ leagueId, season, eventGroupId, currentEventGroupId }) => {
  const { positions: leaguePositions, sportConfig } = useLeague();

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [positions, setPositions] = useState<LeaguePosition[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<FullMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);

  const isCurrentEventGroup = currentEventGroupId != null && eventGroupId === currentEventGroupId;

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

        if (!leagueId || !season || !eventGroupId) return;

        const effectivePositions = leaguePositions.length > 0 ? leaguePositions : [];
        if (effectivePositions.length === 0) {
          throw new Error('No positions configured for this league');
        }
        setPositions(effectivePositions);

        const [teamsData, membersData] = await Promise.all([
          getLeagueTeams(leagueId, { season, eventGroupId }),
          getLeagueUsers(leagueId),
        ]);

        // Fetch projections
        const projectionsByPosition = new Map<string, Map<string, number>>();
        if (sportConfig?.sharedProjectionPool) {
          // Shared pool — fetch once, reuse for all positions
          try {
            const data = await getProjections(season, eventGroupId, effectivePositions[0].position, sportConfig.key);
            const map = new Map<string, number>();
            if (Array.isArray(data)) {
              data.forEach((entry: any) => {
                if (entry.playerId) map.set(String(entry.playerId), entry.projectedPoints ?? 0);
              });
            }
            for (const pos of effectivePositions) {
              projectionsByPosition.set(pos.position, map);
            }
          } catch (e) {
            console.error("Error processing shared projections", e);
          }
        } else {
          // Per-position projections
          const projectionPromises = effectivePositions.map((pos) =>
            getProjections(season, eventGroupId, pos.position, sportConfig?.key)
              .then((data) => {
                const map = new Map<string, number>();
                if (Array.isArray(data)) {
                  data.forEach((entry: any) => {
                    if (entry.playerId) map.set(String(entry.playerId), entry.projectedPoints ?? 0);
                  });
                }
                projectionsByPosition.set(pos.position, map);
              })
              .catch((e) => console.error(`Error processing ${pos.position} projections`, e))
          );
          await Promise.all(projectionPromises);
        }

        if (cancelled) return;

        // Fetch current season from sport config
        if (sportConfig?.supportsScoring) {
          try {
            const fetchedSeason = await sportConfig.fetchCurrentSeason();
            if (fetchedSeason != null && !cancelled) setCurrentSeason(Number(fetchedSeason));
          } catch (e) {
            console.error("Error fetching current season", e);
          }
        } else {
          if (!cancelled) setCurrentSeason(Number(season));
        }

        const fullMembers: FullMember[] = await Promise.all(
          membersData.map(async (leagueMember) => {
            const member = await getUser(leagueMember.userId);
            return { ...leagueMember, user: member } as FullMember;
          })
        );

        setMembers(fullMembers);

        const teams = Array.isArray(teamsData) ? teamsData : [];

        const derivedEntries: Entry[] = await Promise.all(
          teams.map(async (team: any) => {
            const member = fullMembers.find((u) => u.userId === team.userId);
            const teamStatus = await teamsApi.getTeamStatus(team.teamId);

            const lineUp: EntryLineUp = {};
            for (const leaguePosition of effectivePositions) {
              const player = team.players?.find((p: any) => p.position === leaguePosition.position) || null;
              if (player) {
                const projMap = projectionsByPosition.get(leaguePosition.position);
                const projection = projMap ? (projMap.get(String(player.playerId)) ?? 0) : 0;
                lineUp[leaguePosition.position] = { ...player, points: projection };
              } else {
                lineUp[leaguePosition.position] = null;
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
  }, [leagueId, season, eventGroupId, leaguePositions, sportConfig]);

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
  };

  const sortedEntries = entries ? [...entries].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0)) : [];

  const seasonNum = Number(season);
  const isPastSeason = currentSeason != null && seasonNum < currentSeason;
  const isCurrentSeason = currentSeason != null && seasonNum === currentSeason;
  // Show results when looking at a non-current event group in the current or past season
  const isPastEventGroup = !isCurrentEventGroup && (isCurrentSeason || isPastSeason);
  const showResults = isPastEventGroup;

  const projectedTotal = (entry: Entry) => {
    let total = 0;
    for (const pos of positions) {
      const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
      total += player?.points ?? 0;
    }
    return total;
  };

  const calculateScores = useCallback(async () => {
    if (!entries || entries.length === 0 || !sportConfig?.supportsScoring) return;
    try {
      const allStats = await Promise.all(
        positions.map((pos) =>
          getStats(season, eventGroupId, pos.position).catch(() => [])
        )
      );
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
  }, [entries, season, eventGroupId, positions, sportConfig]);

  useEffect(() => {
    if (!showResults) return;
    if (!entries || entries.length === 0) return;
    const needsScores = entries.some((entry) => typeof entry.finalScore !== "number");
    if (!needsScores) return;
    void calculateScores();
  }, [showResults, entries, calculateScores]);

  const getDisplayName = (position: string) =>
    sportConfig?.getPositionDisplayName(position) ?? position;

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
                  <th className={thClass}>{getDisplayName(pos.position)}</th>
                  <th className={thClass}>{getDisplayName(pos.position)} Proj</th>
                  <th className={thClass}>{getDisplayName(pos.position)} Final</th>
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
                  <th className={thClass}>{getDisplayName(pos.position)}</th>
                  <th className={thClass}>{getDisplayName(pos.position)} Proj</th>
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

  if (loading) return <div className="space-y-4"><LoadingSpinner message="Loading entries..." /></div>;
  if (error) return <div className="space-y-4"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="space-y-4">
      {showResults ? (
        <ResultsTable entries={sortedEntries} />
      ) : (
        <ProjectionsTable entries={sortedEntries} />
      )}
      {isCurrentSeason && isCurrentEventGroup && entries && isEntryPlayable && user && (
        <Link to="/game/setting-lineups" state={{ leagueId, season, eventGroupId }}>
          <button className="btn-primary">Play Game</button>
        </Link>
      )}
      {isAdmin && isCurrentSeason && isCurrentEventGroup && playersWithPlayableEntries.length > 0 && (
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
            <Link to="/game/group" state={{ leagueId, season, eventGroupId, participants: selectedMembers }}>
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
