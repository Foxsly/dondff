import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {getCurrentUser} from "../api/auth";
import {getLeagueTeams, getLeagueUsers} from "../api/leagues";
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
  actualPoints?: number | null;
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
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: 'PENDING' | 'PLAYING' | 'FINISHED';
}

const Entries: React.FC<EntriesProps> = ({ leagueId, season, eventGroupId, currentEventGroupId, startDate, endDate, status }) => {
  const { positions: leaguePositions, sportConfig } = useLeague();

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [positions, setPositions] = useState<LeaguePosition[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<FullMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);

  // TODO: Make this smarter - allow playing if status is PENDING or PLAYING
  // Remove reliance on currentEventGroup concept entirely
  const isEventGroupEnded = status === 'FINISHED';

  const isCurrentEventGroup = status === 'PENDING' || status === 'PLAYING';

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
            let computedFinalScore: number | null = null;
            let allHaveActual = true;
            for (const leaguePosition of effectivePositions) {
              const player = team.players?.find((p: any) => p.position === leaguePosition.position) || null;
              if (player) {
                lineUp[leaguePosition.position] = {
                  ...player,
                  points: player.projectedPoints ?? 0,
                  pprScore: player.actualPoints ?? undefined,
                };
                if (player.actualPoints != null) {
                  computedFinalScore = (computedFinalScore ?? 0) + player.actualPoints;
                } else {
                  allHaveActual = false;
                }
              } else {
                lineUp[leaguePosition.position] = null;
                allHaveActual = false;
              }
            }

            const finalScore = allHaveActual ? computedFinalScore : null;

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
  // Show results when event group has ended (by date or by season/eventGroup comparison)
  const isPastEventGroup = isEventGroupEnded || (!isCurrentEventGroup && (isCurrentSeason || isPastSeason));
  const showResults = isPastEventGroup;

  const projectedTotal = (entry: Entry) => {
    let total = 0;
    for (const pos of positions) {
      const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
      total += player?.points ?? 0;
    }
    return total;
  };

  const getDisplayName = (position: string) =>
    sportConfig?.getPositionDisplayName(position) ?? position;

  function EntryCard({ entry, showFinal, rank }: { entry: Entry; showFinal: boolean; rank?: number }) {
    const projTotal = projectedTotal(entry);
    const hasFinal = showFinal && typeof entry.finalScore === "number";

    const rankColors: Record<number, { bg: string; text: string; border: string }> = {
      1: { bg: '#44370a', text: '#fbbf24', border: '#92700c' },
      2: { bg: '#2a2d30', text: '#9ca3af', border: '#4b5563' },
      3: { bg: '#3b2410', text: '#fb923c', border: '#9a3412' },
    };
    const rankStyle = rank != null ? rankColors[rank] : null;

    return (
      <div
        style={{
          width: 340,
          background: '#182030',
          border: '1px solid #2d3d52',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            background: '#1e2a3c',
            borderBottom: '1px solid #2d3d52',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {rank != null && (
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
                background: rankStyle?.bg ?? '#2d3d52',
                color: rankStyle?.text ?? '#6b7280',
                border: `1px solid ${rankStyle?.border ?? '#3a465b'}`,
              }}
            >
              {rank}
            </span>
          )}
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>
            {memberLabel(entry.name || entry.email)}
          </span>
        </div>

        {/* Column headers */}
        <div
          style={{
            padding: '10px 20px 4px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6b7280',
          }}
        >
          <span style={{ flex: 1 }}>Player</span>
          <span style={{ width: 56, textAlign: 'right' }}>Proj</span>
          {hasFinal && <span style={{ width: 56, textAlign: 'right' }}>Final</span>}
        </div>

        {/* Player rows */}
        <div style={{ padding: '0 12px' }}>
          {positions.map((pos, i) => {
            const player = entry.lineUp?.[pos.position] as EntryPlayer | null;
            const isLast = i === positions.length - 1;
            return (
              <div
                key={pos.position}
                style={{
                  margin: '0 8px',
                  padding: '10px 0',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: isLast ? 'none' : '1px solid rgba(45,61,82,0.5)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', lineHeight: 1 }}>
                    {getDisplayName(pos.position)}
                  </div>
                  <div style={{ fontSize: 14, color: '#e5e7eb', fontWeight: 500, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {player?.playerName ?? <span style={{ color: '#4b5563', fontStyle: 'italic' }}>---</span>}
                  </div>
                </div>
                <span style={{ width: 56, textAlign: 'right', fontSize: 14, fontFamily: 'monospace', color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                  {roundToTwo(player?.points)}
                </span>
                {hasFinal && (
                  <span style={{ width: 56, textAlign: 'right', fontSize: 14, fontFamily: 'monospace', color: '#e5e7eb', fontVariantNumeric: 'tabular-nums' }}>
                    {roundToTwo(player?.pprScore)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals footer */}
        <div
          style={{
            margin: '4px 20px 16px',
            paddingTop: 12,
            borderTop: '1px solid #2d3d52',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
              Proj Total
            </div>
            <div style={{ fontSize: 20, fontFamily: 'monospace', color: '#9ca3af', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
              {roundToTwo(projTotal)}
            </div>
          </div>
          {hasFinal && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280' }}>
                Final Score
              </div>
              <div style={{ fontSize: 28, fontFamily: 'monospace', fontWeight: 700, color: '#34d399', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {roundToTwo(entry.finalScore)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className="space-y-4"><LoadingSpinner message="Loading entries..." /></div>;
  if (error) return <div className="space-y-4"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="space-y-4">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
        {sortedEntries.map((entry, i) => (
          <EntryCard key={entry.teamId} entry={entry} showFinal={showResults} rank={showResults ? i + 1 : undefined} />
        ))}
      </div>
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
