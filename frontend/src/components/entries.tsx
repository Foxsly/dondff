import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { getLeagueTeams, getLeagueUsers } from '../api/leagues';
import * as teamsApi from '../api/teams';
import { getUser } from '../api/users';
import { useLeague } from '../contexts/LeagueContext';
import type { LeaguePosition, TeamPlayer, User } from '../types';
import StandingsTable, { type StandingsRow } from './league/StandingsTable';
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  LineupCard,
  Modal,
  SegmentedControl,
  Skeleton,
  buttonVariants,
  type LineupSlot,
} from './ui';

interface EntryPlayer extends TeamPlayer {
  actualPoints?: number | null;
}

interface Entry {
  teamId: string;
  userId: string;
  name?: string;
  email?: string;
  players: Record<string, EntryPlayer | null>;
  projectedTotal: number;
  finalScore: number | null;
  playable: boolean;
}

interface FullMember {
  userId: string;
  role?: string;
  user: User;
}

export interface EntriesProps {
  leagueId: string;
  season: string | number;
  eventGroupId: string;
  currentEventGroupId?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: 'PENDING' | 'PLAYING' | 'FINISHED';
}

type View = 'cards' | 'table';

const Entries: React.FC<EntriesProps> = ({
  leagueId,
  season,
  eventGroupId,
  status,
}) => {
  const { positions: leaguePositions, sportConfig } = useLeague();

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [positions, setPositions] = useState<LeaguePosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);
  const [view, setView] = useState<View>('cards');

  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<FullMember[]>([]);

  const isEventGroupEnded = status === 'FINISHED';
  const isCurrentEventGroup = status === 'PENDING' || status === 'PLAYING';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError('');
        setLoading(true);

        try {
          const current = await getCurrentUser();
          if (!cancelled) setUser(current);
        } catch (err) {
          console.error('Failed to load current user', err);
          if (!cancelled) setUser(null);
        }

        if (!leagueId || !season || !eventGroupId) return;

        if (leaguePositions.length === 0) {
          throw new Error('No positions configured for this league');
        }
        if (!cancelled) setPositions(leaguePositions);

        const [teamsData, membersData] = await Promise.all([
          getLeagueTeams(leagueId, { season, eventGroupId }),
          getLeagueUsers(leagueId),
        ]);

        if (cancelled) return;

        if (sportConfig?.supportsScoring) {
          try {
            const fetched = await sportConfig.fetchCurrentSeason();
            if (fetched != null && !cancelled) setCurrentSeason(Number(fetched));
          } catch (err) {
            console.error('Error fetching current season', err);
          }
        } else if (!cancelled) {
          setCurrentSeason(Number(season));
        }

        const fullMembers: FullMember[] = await Promise.all(
          membersData.map(async (member) => ({
            userId: member.userId,
            role: member.role,
            user: await getUser(member.userId),
          })),
        );

        if (cancelled) return;
        setMembers(fullMembers);

        const teams = Array.isArray(teamsData) ? teamsData : [];

        const derived: Entry[] = await Promise.all(
          teams.map(async (team: any) => {
            const member = fullMembers.find((m) => m.userId === team.userId);
            const teamStatus = await teamsApi.getTeamStatus(team.teamId);

            const players: Record<string, EntryPlayer | null> = {};
            let projectedTotal = 0;
            let actualTotal: number | null = null;
            let everySlotScored = true;

            for (const leaguePosition of leaguePositions) {
              const player =
                team.players?.find((p: any) => p.position === leaguePosition.position) ?? null;

              players[leaguePosition.position] = player;
              projectedTotal += player?.projectedPoints ?? 0;

              if (player?.actualPoints != null) {
                actualTotal = (actualTotal ?? 0) + player.actualPoints;
              } else {
                everySlotScored = false;
              }
            }

            return {
              teamId: team.teamId,
              userId: team.userId,
              name: member?.user?.name,
              email: member?.user?.email,
              players,
              projectedTotal,
              // A partial total would read as a real score, so hold it back
              // until every slot has an actual.
              finalScore: everySlotScored ? actualTotal : null,
              playable: teamStatus.playable,
            };
          }),
        );

        if (!cancelled) setEntries(derived);
      } catch (err: any) {
        console.error('Failed to load entries', err);
        if (!cancelled) setError(err?.message ?? 'Failed to load entries');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId, season, eventGroupId, leaguePositions, sportConfig]);

  const seasonNum = Number(season);
  const isCurrentSeason = currentSeason != null && seasonNum === currentSeason;
  const isPastSeason = currentSeason != null && seasonNum < currentSeason;
  const showResults =
    isEventGroupEnded || (!isCurrentEventGroup && (isCurrentSeason || isPastSeason));

  const currentUserId = user?.userId || user?.id;

  const labelFor = (entry: Entry) => {
    const member = members.find((m) => m.userId === entry.userId);
    return member?.user?.name || member?.user?.email || entry.name || entry.email || 'Unknown';
  };

  const slotsFor = (entry: Entry): LineupSlot[] =>
    positions.map((position) => {
      const player = entry.players[position.position];
      return {
        position: position.position,
        positionLabel:
          sportConfig?.getPositionDisplayName(position.position) ?? position.position,
        playerName: player?.playerName ?? null,
        projected: player?.projectedPoints ?? 0,
        actual: player?.actualPoints ?? null,
      };
    });

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        // Before results land there is nothing to rank on, so keep the order
        // stable by name rather than letting everyone tie at zero.
        if (!showResults) return labelFor(a).localeCompare(labelFor(b));
        return (b.finalScore ?? 0) - (a.finalScore ?? 0);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, showResults, members],
  );

  const membersWithPlayedEntries = new Set(
    entries.filter((entry) => !entry.playable).map((entry) => entry.userId),
  );
  const playableMembers = members.filter(
    (member) => member.userId && !membersWithPlayedEntries.has(member.userId),
  );

  const currentMember = members.find((member) => member.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';
  const canPlaySelf =
    !!user &&
    isCurrentSeason &&
    isCurrentEventGroup &&
    entries.every((entry) => entry.userId !== currentUserId || entry.playable);

  const toggleMember = (member: FullMember) =>
    setSelectedMembers((current) =>
      current.some((m) => m.userId === member.userId)
        ? current.filter((m) => m.userId !== member.userId)
        : [...current, member],
    );

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-wrap gap-5">
          <Skeleton className="h-72 w-[340px] rounded-lg" />
          <Skeleton className="h-72 w-[340px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  const actions = (
    <>
      {canPlaySelf && (
        <Link
          to="/game/setting-lineups"
          state={{ leagueId, season, eventGroupId }}
          className={buttonVariants({ variant: 'primary' })}
        >
          Play your lineup
        </Link>
      )}
      {isAdmin && isCurrentSeason && isCurrentEventGroup && playableMembers.length > 0 && (
        <Button variant="secondary" onClick={() => setGroupOpen(true)}>
          Start group game
        </Button>
      )}
    </>
  );

  if (entries.length === 0) {
    return (
      <>
        <EmptyState
          title="No entries yet"
          description={
            canPlaySelf
              ? 'Be the first to draft a lineup for this event.'
              : 'Nobody has drafted a lineup for this event.'
          }
          action={actions}
        />
        {renderGroupModal()}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Explicit generic: the options array widens its `value` to string,
              which would otherwise beat View in inference. */}
          <SegmentedControl<View>
            label="Standings view"
            size="sm"
            options={[
              { value: 'cards', label: 'Cards' },
              { value: 'table', label: 'Table' },
            ]}
            value={view}
            onChange={setView}
          />
          <span className="text-sm text-text-subtle">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            {!showResults && ' · results pending'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      </div>

      {view === 'cards' ? (
        <div className="flex flex-wrap justify-center gap-5">
          {sortedEntries.map((entry, index) => (
            <LineupCard
              key={entry.teamId}
              title={labelFor(entry)}
              rank={showResults ? index + 1 : undefined}
              slots={slotsFor(entry)}
              showFinal={showResults}
              projectedTotal={entry.projectedTotal}
              finalScore={entry.finalScore}
              isCurrentUser={entry.userId === currentUserId}
            />
          ))}
        </div>
      ) : (
        <StandingsTable
          showFinal={showResults}
          positionLabels={positions.map(
            (position) =>
              sportConfig?.getPositionDisplayName(position.position) ?? position.position,
          )}
          rows={sortedEntries.map<StandingsRow>((entry, index) => ({
            id: entry.teamId,
            name: labelFor(entry),
            rank: showResults ? index + 1 : undefined,
            slots: slotsFor(entry),
            projectedTotal: entry.projectedTotal,
            finalScore: entry.finalScore,
            isCurrentUser: entry.userId === currentUserId,
          }))}
        />
      )}

      {renderGroupModal()}
    </div>
  );

  function renderGroupModal() {
    return (
      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="Start a group game"
        description="Everyone selected plays their lineup in turn, on this device."
        footer={
          <>
            <Button variant="ghost" onClick={() => setGroupOpen(false)}>
              Cancel
            </Button>
            <Link
              to="/game/group"
              state={{ leagueId, season, eventGroupId, participants: selectedMembers }}
              className={buttonVariants({ variant: 'primary' })}
              aria-disabled={selectedMembers.length === 0}
              onClick={(event) => {
                if (selectedMembers.length === 0) event.preventDefault();
              }}
            >
              Start with {selectedMembers.length || 'no'}{' '}
              {selectedMembers.length === 1 ? 'player' : 'players'}
            </Link>
          </>
        }
      >
        <div className="space-y-3">
          {playableMembers.map((member) => (
            <Checkbox
              key={member.userId}
              checked={selectedMembers.some((m) => m.userId === member.userId)}
              onChange={() => toggleMember(member)}
              label={member.user?.name || member.user?.email || member.userId}
            />
          ))}
        </div>
      </Modal>
    );
  }
};

export default Entries;
