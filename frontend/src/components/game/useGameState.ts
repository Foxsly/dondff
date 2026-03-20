import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../api/auth';
import { getLeague } from '../../api/leagues';
import * as teamsApi from '../../api/teams';
import { getSportConfig } from '../../sports/registry';
import type { SportConfig } from '../../sports/types';
import type { GameBox, GameOffer, GamePlayer, LineUpSlot, SportLeague, TeamUser } from '../../types';

interface UseGameStateParams {
  leagueId: string;
  season: string | number;
  week: string | number;
  teamUser?: TeamUser;
}

export const useGameState = ({ leagueId, season, week, teamUser }: UseGameStateParams) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [cases, setCases] = useState<GameBox[] | null>(null);
  const [players, setPlayers] = useState<GamePlayer[] | null>(null);
  const [offer, setOffer] = useState<GameOffer | null>(null);
  const [caseSelected, setCaseSelected] = useState<GameBox | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [lineUp, setLineUp] = useState<LineUpSlot[]>([]);
  const [resetUsed, setResetUsed] = useState<Record<string, boolean>>({});
  const [sportConfig, setSportConfig] = useState<SportConfig | null>(null);
  const [error, setError] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [setupTrigger, setSetupTrigger] = useState(0);
  const hasEnsuredTeamRef = useRef(false);
  const hasSetupGameRef = useRef(false);

  // Load user + league sport config
  useEffect(() => {
    const loadUserAndLeague = async () => {
      try {
        if (teamUser) {
          setCurrentUser(teamUser.user);
          setCurrentName(teamUser.user.name ?? null);
        } else {
          const current = await getCurrentUser();
          setCurrentUser(current);
          setCurrentName(current?.name ?? null);
        }
      } catch (err) {
        console.error("Failed to load current user for game", err);
      }

      if (leagueId) {
        try {
          const league = await getLeague(leagueId);
          if (league.sportLeague) {
            setSportConfig(getSportConfig(league.sportLeague));
          }
        } catch (err: any) {
          console.error("Failed to load league for game", err);
          setError(err?.message ?? "Failed to load league");
        }
      }
    };
    loadUserAndLeague();
  }, [teamUser, leagueId]);

  // Ensure team exists
  const ensureTeamForContext = useCallback(
    async (user: any) => {
      if (!user || !leagueId || !season || !week) return null;

      const userId = user.id || user.userId;
      if (!userId) return null;

      let resolvedTeamId: string | null = null;

      try {
        const teams = await teamsApi.getTeam(leagueId).catch(() => null);
        // Use league teams endpoint
        const { getLeagueTeams } = await import('../../api/leagues');
        const leagueTeams = await getLeagueTeams(leagueId);
        if (Array.isArray(leagueTeams)) {
          const existing = leagueTeams.find((t: any) =>
            String(t.leagueId) === String(leagueId) &&
            String(t.userId) === String(userId) &&
            Number(t.seasonYear) === Number(season) &&
            Number(t.week) === Number(week)
          );
          if (existing) resolvedTeamId = existing.teamId || existing.id;
        }
      } catch (err) {
        console.error("Error fetching league teams", err);
      }

      if (!resolvedTeamId) {
        try {
          const createdTeam = await teamsApi.createTeam({
            leagueId,
            userId,
            seasonYear: Number(season),
            week: Number(week),
          });
          resolvedTeamId = createdTeam.teamId || createdTeam.id;
        } catch (err) {
          console.error("Failed to create team", err);
          return null;
        }
      }

      return resolvedTeamId;
    },
    [leagueId, season, week]
  );

  useEffect(() => {
    if (hasEnsuredTeamRef.current) return;
    if (!currentUser || !leagueId || !season || !week) return;
    hasEnsuredTeamRef.current = true;

    (async () => {
      const id = await ensureTeamForContext(currentUser);
      if (id) setTeamId(id);
    })();
  }, [currentUser, leagueId, season, week, ensureTeamForContext]);

  // Fetch team entries
  const fetchTeamEntries = useCallback(async () => {
    const entries = await teamsApi.getTeamEntries(teamId!);
    if (!Array.isArray(entries)) throw new Error("Invalid team entries data");
    if (entries.length === 0) throw new Error("No team entries found");
    return entries;
  }, [teamId]);

  // Setup game
  const setupGame = useCallback(async () => {
    const entries = await fetchTeamEntries();

    let teamPlayers: any[] = [];
    try {
      const teamData = await teamsApi.getTeam(teamId!);
      teamPlayers = teamData.players || [];
    } catch (e) {
      console.warn("Failed to fetch team players", e);
    }

    let selectedPosition: string | null = null;
    for (const entry of entries) {
      if (entry.status !== 'finished') {
        selectedPosition = entry.position;
        break;
      }
    }

    if (!selectedPosition) {
      throw new Error("All positions are already complete for this team");
    }

    setPosition(selectedPosition);

    const initialLineup: LineUpSlot[] = entries.map((entry: any) => {
      const player = teamPlayers.find((p: any) => p.position === entry.position);
      return {
        position: entry.position,
        playerName: entry.status === 'finished' && player ? player.playerName : 'awaiting game...',
        complete: entry.status === 'finished',
      };
    });
    setLineUp(initialLineup);

    const initialResetUsed: Record<string, boolean> = {};
    entries.forEach((entry: any) => { initialResetUsed[entry.position] = false; });
    setResetUsed((prev) => {
      const merged = { ...initialResetUsed };
      for (const key of Object.keys(prev)) {
        if (prev[key]) merged[key] = true;
      }
      return merged;
    });

    const getCasesResult = await teamsApi.getCases(teamId!, selectedPosition);
    setCases(getCasesResult.boxes);
    setPlayers(getCasesResult.players);
    const selected = getCasesResult.boxes.find((c: GameBox) => c.boxStatus === 'selected');
    setCaseSelected(selected ?? null);

    if (selected) {
      const currentOffer = await teamsApi.getCurrentOffer(teamId!, selectedPosition);
      setOffer(currentOffer);
    }
  }, [teamId, fetchTeamEntries]);

  useEffect(() => {
    if (hasSetupGameRef.current) return;
    if (!teamId) return;
    hasSetupGameRef.current = true;

    (async () => { await setupGame(); })();
  }, [teamId, setupGame, setupTrigger]);

  // Handle eliminated cases (update local state)
  const handleEliminatedCases = useCallback(
    (eliminatedCases: GameBox[]) => {
      if (players && eliminatedCases) {
        for (const ec of eliminatedCases) {
          const p = players.find((p) => p.playerId === ec.playerId);
          if (p) p.boxStatus = ec.boxStatus;
        }
      }
      setPlayers(players ? [...players] : null);

      if (cases && eliminatedCases) {
        for (const ec of eliminatedCases) {
          const box = cases.find((b) => b.boxNumber === ec.boxNumber);
          if (box) {
            box.boxStatus = ec.boxStatus;
            box.playerName = ec.playerName;
            box.projectedPoints = ec.projectedPoints;
            box.playerId = ec.playerId;
          }
        }
      }
      setCases(cases ? [...cases] : null);
    },
    [cases, players]
  );

  // Actions
  const selectCase = async (box: GameBox) => {
    setCaseSelected(box);
    const result = await teamsApi.selectCase(teamId!, { position: position!, boxNumber: box.boxNumber });
    setOffer(result.offer);
    handleEliminatedCases(result.boxes);
  };

  const declineOffer = async () => {
    const result = await teamsApi.rejectOffer(teamId!, { position: position! });
    setOffer(result.offer);
    handleEliminatedCases(result.boxes);
  };

  const acceptOffer = async () => {
    const result = await teamsApi.acceptOffer(teamId!, { position: position! });
    const casesToEliminate = result.boxes.map((box: GameBox) => ({
      ...box,
      boxStatus: 'eliminated',
    }));
    handleEliminatedCases(casesToEliminate);
    setOffer({ ...offer!, status: 'accepted' });
    const lineUpPosition = lineUp.find((v) => v.position === position);
    if (lineUpPosition) {
      lineUpPosition.playerName = offer!.playerName;
      lineUpPosition.complete = true;
    }
  };

  const keep = useCallback(async () => {
    const result = await teamsApi.finalDecision(teamId!, { position: position!, decision: 'keep' });
    const boxes: GameBox[] = result.boxes;
    const selectedPlayer = boxes.find((box) => box.boxStatus === 'selected');
    handleEliminatedCases(boxes);
    const lineUpPosition = lineUp.find((v) => v.position === position);
    if (lineUpPosition && selectedPlayer) {
      lineUpPosition.playerName = selectedPlayer.playerName ?? '';
      lineUpPosition.complete = true;
    }
    setCaseSelected(selectedPlayer ?? null);
    setOffer(null);
  }, [handleEliminatedCases, lineUp, position, teamId]);

  const swap = useCallback(async () => {
    const result = await teamsApi.finalDecision(teamId!, { position: position!, decision: 'swap' });
    const boxes: GameBox[] = result.boxes;
    const selectedPlayer = boxes.find((box) => box.boxStatus === 'swapped');
    const updatedBoxes = boxes.map((box) => ({
      ...box,
      boxStatus:
        box.boxStatus === 'selected' ? 'eliminated' :
        box.boxStatus === 'swapped' ? 'selected' :
        box.boxStatus,
    }));
    handleEliminatedCases(updatedBoxes);
    const lineUpPosition = lineUp.find((v) => v.position === position);
    if (lineUpPosition && selectedPlayer) {
      lineUpPosition.playerName = selectedPlayer.playerName ?? '';
      lineUpPosition.complete = true;
    }
    setCaseSelected(selectedPlayer ?? null);
    setOffer(null);
  }, [handleEliminatedCases, lineUp, position, teamId]);

  const resetGame = async () => {
    if (!position || caseSelected || resetUsed[position]) return;
    const result = await teamsApi.resetCases(teamId!, { position });
    setCases(result.boxes);
    setPlayers(result.players);
    setResetUsed({ ...resetUsed, [position]: true });
  };

  const advanceToNextPosition = async () => {
    const entries = await fetchTeamEntries();

    let nextPosition: string | null = null;
    let foundCurrent = false;

    for (const entry of entries) {
      if (entry.position === position) {
        foundCurrent = true;
        continue;
      }
      if (entry.status !== 'finished') {
        nextPosition = entry.position;
        break;
      }
    }

    if (!foundCurrent) {
      throw new Error(`Current position ${position} not found in team entries`);
    }

    if (nextPosition) {
      setPosition(nextPosition);
      setOffer(null);
      setPlayers(null);
      setCases(null);
      setCaseSelected(null);
      hasSetupGameRef.current = false;
      setSetupTrigger((n) => n + 1);
    } else {
      throw new Error("No more incomplete positions available");
    }
  };

  const allPositionsDone = lineUp.length > 0 && lineUp.every((lu) => lu.complete === true);
  const isKeepOrSwap = !!(players && players.filter((p) => p.boxStatus === 'available').length === 2);

  return {
    // State
    currentName,
    cases,
    players,
    offer,
    caseSelected,
    position,
    lineUp,
    resetUsed,
    sportConfig,
    error,
    allPositionsDone,
    isKeepOrSwap,
    // Actions
    selectCase,
    acceptOffer,
    declineOffer,
    keep,
    swap,
    resetGame,
    advanceToNextPosition,
  };
};
