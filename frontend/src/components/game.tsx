import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser } from "../api/auth";
import type { TeamUser, GameBox, GamePlayer, GameOffer, LineUpSlot, SportLeague, LeagueSettings } from '../types';
import { getPositionDisplayName, isGolfPosition } from './util';

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

interface GameLocationState {
  leagueId: string;
  season: string | number;
  week: string | number;
}

interface GameProps {
  teamUser?: TeamUser;
  onComplete?: () => void;
}

const Game: React.FC<GameProps> = ({ teamUser, onComplete }) => {
  const { leagueId, season, week } = useLocation().state as GameLocationState;
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [cases, setCases] = useState<GameBox[] | null>(null);
  const [players, setPlayers] = useState<GamePlayer[] | null>(null);
  const [offer, setOffer] = useState<GameOffer | null>(null);
  const [caseSelected, setCaseSelected] = useState<GameBox | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [lineUp, setLineUp] = useState<LineUpSlot[]>([]);
  const [thinking, setThinking] = useState(false);
  const [reset, setReset] = useState(false);
  const [resetUsed, setResetUsed] = useState<Record<string, boolean>>({});
  const [sportLeague, setSportLeague] = useState<SportLeague>('NFL');
  const [teamId, setTeamId] = useState<string | null>(null);
  const hasEnsuredTeamRef = React.useRef(false);
  const hasSetupGameRef = React.useRef(false);

  useEffect(() => {
    const loadUserAndName = async () => {
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
        console.error("Failed to load current user/name for game", err);
      }
    };
    loadUserAndName();

    // Fetch league settings to determine sport
    //TODO this should come from the League now
    if (leagueId) {
      fetch(`${API_BASE}/leagues/${leagueId}/settings/latest`, { credentials: "include" })
        .then((res) => res.ok ? res.json() : null)
        .then((settings: LeagueSettings | null) => {
          if (settings?.sportLeague) setSportLeague(settings.sportLeague);
        })
        .catch(() => {});
    }
  }, [teamUser, leagueId]);

  const ensureTeamForContext = useCallback(
    async (user: any) => {
      if (!user || !leagueId || !season || !week) return null;

      const userId = user.id || user.userId;
      if (!userId) return null;

      let resolvedTeamId: string | null = null;

      try {
        const teamsRes = await fetch(`${API_BASE}/leagues/${leagueId}/teams`, { credentials: "include" });
        if (teamsRes.ok) {
          const teams = await teamsRes.json();
          if (Array.isArray(teams)) {
            const existing = teams.find((t: any) =>
              String(t.leagueId) === String(leagueId) &&
              String(t.userId) === String(userId) &&
              Number(t.seasonYear) === Number(season) &&
              Number(t.week) === Number(week)
            );
            if (existing) resolvedTeamId = existing.teamId || existing.id;
          }
        } else {
          console.warn("Failed to load teams for league in ensureTeamForContext", teamsRes.status);
        }
      } catch (err) {
        console.error("Error fetching league teams in ensureTeamForContext", err);
      }

      if (!resolvedTeamId) {
        try {
          const createRes = await fetch(`${API_BASE}/teams`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ leagueId, userId, seasonYear: Number(season), week: Number(week) }),
          });
          if (!createRes.ok) throw new Error(`Failed to create team (status ${createRes.status})`);
          const createdTeam = await createRes.json();
          resolvedTeamId = createdTeam.teamId || createdTeam.id;
        } catch (err) {
          console.error("Failed to create team in ensureTeamForContext", err);
          return null;
        }
      }

      console.log("ResolvedTeamId: ", resolvedTeamId);
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
      if (id) {
        setTeamId(id);
      } else {
        console.warn("ensureTeamForContext did not resolve a teamId");
      }
    })();
  }, [currentUser, leagueId, season, week, ensureTeamForContext]);

  const fetchTeamEntries = useCallback(async () => {
    console.log("TRACE: fetchTeamEntries called");
    const getEntriesResponse = await fetch(`${API_BASE}/teams/${teamId}/entry`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    console.log("TRACE: fetchTeamEntries response status:", getEntriesResponse.status);

    if (!getEntriesResponse.ok) {
      throw new Error(`Failed to fetch team entries (status ${getEntriesResponse.status})`);
    }

    const entries = await getEntriesResponse.json();
    console.log("TRACE: fetchTeamEntries received entries:", entries);

    if (!Array.isArray(entries)) throw new Error("Invalid team entries data received from server");
    if (entries.length === 0) throw new Error("No team entries found - team may not be properly initialized");

    return entries;
  }, [teamId]);

  const setupGame = useCallback(async () => {
    const entries = await fetchTeamEntries();

    // Fetch team data to get player names for finished positions
    let teamPlayers: any[] = [];
    try {
      const teamRes = await fetch(`${API_BASE}/teams/${teamId}`, { credentials: "include" });
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        teamPlayers = teamData.players || [];
      }
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
      console.error("TRACE: setupGame - all positions complete");
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

    // Initialize resetUsed for all positions
    const initialResetUsed: Record<string, boolean> = {};
    entries.forEach((entry: any) => { initialResetUsed[entry.position] = false; });
    setResetUsed((prev) => {
      // Preserve any already-used resets
      const merged = { ...initialResetUsed };
      for (const key of Object.keys(prev)) {
        if (prev[key]) merged[key] = true;
      }
      return merged;
    });

    const getCasesResponse = await fetch(`${API_BASE}/teams/${teamId}/cases?position=${selectedPosition}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!getCasesResponse.ok) {
      throw new Error(`Failed to retrieve cases (status ${getCasesResponse.status})`);
    }
    const getCases = await getCasesResponse.json();
    setCases(getCases.boxes);
    setPlayers(getCases.players);
    const selectedCase = getCases.boxes.find((c: GameBox) => c.boxStatus === 'selected');
    setCaseSelected(selectedCase);

    if (selectedCase) {
      const getCurrentOffer = await fetch(`${API_BASE}/teams/${teamId}/offers?position=${selectedPosition}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const currentOffer = await getCurrentOffer.json();
      setOffer(currentOffer);
    } else {
      console.log("TRACE: setupGame - no selected case, skipping offer fetch");
    }
  }, [teamId, fetchTeamEntries, position]);

  useEffect(() => {
    console.log("TRACE: setupGame entry: ", hasSetupGameRef, teamId);
    if (hasSetupGameRef.current) return;
    if (!teamId) return;
    hasSetupGameRef.current = true;

    (async () => {
      console.log("calling setupGame");
      await setupGame();
    })();
  }, [teamId, setupGame]);

  const resetGameHandler = async () => {
    resetGame(position!);
  };

  const resetGame = async (pos: string) => {
    if (caseSelected || resetUsed[pos]) return;
    const resetResponse = await fetch(`${API_BASE}/teams/${teamId}/cases/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ position: pos }),
    });
    const result = await resetResponse.json();
    setCases(result.boxes);
    setPlayers(result.players);
    setResetUsed({ ...resetUsed, [pos]: true });
    setReset(true);
  };

  const handleEliminatedCases = useCallback(
    (eliminatedCases: GameBox[]) => {
      if (players && eliminatedCases) {
        for (const eliminatedCase of eliminatedCases) {
          const eliminatedPlayer = players.find((p) => p.playerId === eliminatedCase.playerId);
          if (eliminatedPlayer) eliminatedPlayer.boxStatus = eliminatedCase.boxStatus;
        }
      }
      setPlayers(players ? [...players] : null);

      if (cases && eliminatedCases) {
        for (const eliminatedCase of eliminatedCases) {
          const eliminatedBox = cases.find((box) => box.boxNumber === eliminatedCase.boxNumber);
          if (eliminatedBox) {
            eliminatedBox.boxStatus = eliminatedCase.boxStatus;
            eliminatedBox.playerName = eliminatedCase.playerName;
            eliminatedBox.projectedPoints = eliminatedCase.projectedPoints;
            eliminatedBox.playerId = eliminatedCase.playerId;
          }
        }
      }
      setCases(cases ? [...cases] : null);
    },
    [cases, players]
  );

  const selectCase = async (box: GameBox) => {
    setCaseSelected(box);
    const selectCaseResponse = await fetch(`${API_BASE}/teams/${teamId}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ position, boxNumber: box.boxNumber }),
    });
    const result = await selectCaseResponse.json();
    setOffer(result.offer);
    handleEliminatedCases(result.boxes);
  };

  const declineOffer = async () => {
    const declineOfferResponse = await fetch(`${API_BASE}/teams/${teamId}/offers/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ position }),
    });
    const result = await declineOfferResponse.json();
    setOffer(result.offer);
    handleEliminatedCases(result.boxes);
  };

  const acceptOffer = async () => {
    const acceptOfferResponse = await fetch(`${API_BASE}/teams/${teamId}/offers/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ position }),
    });
    const acceptedOffer = await acceptOfferResponse.json();
    const casesToEliminate = acceptedOffer.boxes.map((box: GameBox) => ({
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
    const finalDecisionResponse = await fetch(`${API_BASE}/teams/${teamId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ position, decision: 'keep' }),
    });
    const finalDecision = await finalDecisionResponse.json();
    const boxes: GameBox[] = finalDecision.boxes;
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
    const finalDecisionResponse = await fetch(`${API_BASE}/teams/${teamId}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ position, decision: 'swap' }),
    });
    const finalDecision = await finalDecisionResponse.json();
    const boxes: GameBox[] = finalDecision.boxes;
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

  const advanceToNextPosition = async () => {
    console.log("TRACE: advanceToNextPosition called, current position:", position);
    const entries = await fetchTeamEntries();
    console.log("TRACE: advanceToNextPosition received entries:", entries);

    let nextPosition: string | null = null;
    let foundCurrent = false;

    for (const entry of entries) {
      if (entry.position === position) {
        foundCurrent = true;
        console.log("TRACE: advanceToNextPosition found current position:", position);
        continue;
      }
      if (entry.status !== 'finished') {
        nextPosition = entry.position;
        console.log("TRACE: advanceToNextPosition found next position:", nextPosition);
        break;
      }
    }

    if (!foundCurrent) {
      console.error("TRACE: advanceToNextPosition - current position not found:", position);
      throw new Error(`Current position ${position} not found in team entries`);
    }

    if (nextPosition) {
      console.log("TRACE: advanceToNextPosition switching to position:", nextPosition);
      setPosition(nextPosition);
      setOffer(null);
      setPlayers(null);
      setCases(null);
      setCaseSelected(null);
      hasSetupGameRef.current = false;
    } else {
      console.error("TRACE: advanceToNextPosition - no more incomplete positions");
      throw new Error("No more incomplete positions available");
    }
  };

  const submitLineup = async () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate(-1);
    }
  };

  const renderCases = () => {
    const showAllCases = players && players.filter((p) => p.boxStatus === 'available').length === 0;
    console.log("rendering cases", cases, caseSelected, players, showAllCases);
    if (cases && caseSelected) {
      return (
        <>
          {cases.map((box) =>
            (box.boxStatus === 'available' || box.boxStatus === 'selected') && !showAllCases ? (
              <div className="box" key={box.boxNumber}>
                <span className="num">{box.boxNumber}</span>
              </div>
            ) : (
              <div className="box opened" key={box.boxNumber}>
                {box.boxNumber}<br />
                {box.playerName}({box.projectedPoints})
              </div>
            )
          )}
        </>
      );
    } else if (cases) {
      return (
        <>
          {cases.map((box) =>
            <div className="box" key={box.boxNumber} onClick={() => selectCase(box)}>
              <span className="num">{box.boxNumber}</span>
            </div>
          )}
        </>
      );
    }
  };

  const isGolf = sportLeague === 'GOLF';

  const renderPlayerDetails = (player: GamePlayer) => {
    if (isGolf) {
      return (
        <>
          <span className="proj">Proj: {player.projectedPoints} | Salary: ${player.salary ?? 'N/A'}</span>
        </>
      );
    }
    return (
      <>
        <span className="status">{player.matchup?.team} {player.injuryStatus}</span><br />
        <span className="proj">Proj: {player.projectedPoints} Opp: {player.matchup?.opponent}</span>
      </>
    );
  };

  const renderPlayerList = () => {
    if (players) {
      return (
        <div className="display-cases">
          Players in cases:
          {players.map((player) =>
            player.boxStatus === 'available' || player.boxStatus === 'selected' ? (
              <div className="list-player" key={player.playerId}>
                {player.playerName} {!isGolf && <span className="status">{player.matchup?.team} {player.injuryStatus}</span>}<br />
                {renderPlayerDetails(player)}
              </div>
            ) : (
              <div className="list-player eliminated" key={player.playerId}>
                {player.playerName} {!isGolf && <span className="status">{player.matchup?.team} {player.boxStatus}</span>}<br />
                {renderPlayerDetails(player)}
              </div>
            )
          )}
        </div>
      );
    }
  };

  const renderInfo = () => {
    if (!caseSelected) {
      return (
        <>
          <div>To begin select a case.</div>
          {renderPlayerList()}
        </>
      );
    }
    if (caseSelected) {
      return (
        <>
          <div className="case-selected-text">You have selected case #{caseSelected.boxNumber}</div>
          {thinking ? <div>Eliminating Cases...</div> : <div></div>}
          {!thinking && players ? <>{renderPlayerList()}</> : null}
        </>
      );
    }
  };

  const renderActions = () => {
    const keepOrSwap = players && players.filter((p) => p.boxStatus === 'available').length === 2;
    const remainingCase = cases && caseSelected && cases.find(
      (c) => c.boxStatus === 'available' && c.boxNumber !== caseSelected.boxNumber
    );
    const allPositionsDone = lineUp && lineUp.every((lu) => lu.complete === true);

    if (offer && offer.status === 'pending' && !keepOrSwap) {
      return (
        <div className="action-box">
          <div className="offer-box">The Banker offers you:
            <div className="list-player">
              {offer.playerName}
              {isGolf ? (
                <><br /><span className="proj">Proj: {offer.projectedPoints} | Salary: ${offer.salary ?? 'N/A'}</span></>
              ) : (
                <><span className="status"> {offer.matchup?.team} {offer.injuryStatus}</span><br />
                <span className="proj">Proj: {offer.projectedPoints} Opp: {offer.matchup?.opponent}</span></>
              )}
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={acceptOffer}>Accept</button>
            <button className="btn" onClick={declineOffer}>Decline</button>
            <button className="btn" onClick={resetGameHandler} disabled={!!caseSelected || resetUsed[position!]}>Reset</button>
          </div>
        </div>
      );
    } else if (offer && keepOrSwap) {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You have rejected all offers and there is one more case remaining: #{remainingCase?.boxNumber}.</p>
            <p>Would you like to keep your original case or swap with the last remaining?</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={keep}>Keep</button>
            <button className="btn" onClick={swap}>Swap</button>
            <button className="btn" onClick={resetGameHandler} disabled={!!caseSelected || resetUsed[position!]}>Reset</button>
          </div>
        </div>
      );
    } else if (offer && offer.status === 'accepted') {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You accepted the Banker's offer.</p>
            <p>Congratulations!! Your player is {offer.playerName}. His projected points are {offer.projectedPoints}</p>
          </div>
          <div className="action-buttons">
            {allPositionsDone
              ? <button className="btn" onClick={submitLineup}>Submit Lineup</button>
              : <button className="btn" onClick={advanceToNextPosition}>Switch Position Group</button>
            }
          </div>
        </div>
      );
    } else if (caseSelected && caseSelected.playerName) {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>Your Final case is case#{caseSelected.boxNumber}</p>
            <p>Congratulations!! Your player is {caseSelected.playerName}. His projected points are {caseSelected.projectedPoints}</p>
          </div>
          <div className="action-buttons">
            {allPositionsDone
              ? <button className="btn" onClick={submitLineup}>Submit Lineup</button>
              : <button className="btn" onClick={advanceToNextPosition}>Switch Position Group</button>
            }
          </div>
        </div>
      );
    } else {
      return (
        <div className="action-buttons">
          <button className="btn" onClick={resetGameHandler} disabled={!!caseSelected || resetUsed[position!]}>Reset</button>
          {allPositionsDone
            ? <button className="btn" onClick={submitLineup}>Submit Lineup</button>
            : <button className="btn" onClick={advanceToNextPosition}>Switch Position Group</button>
          }
        </div>
      );
    }
  };

  return (
    <>
      <h3>Current User: {currentName}</h3>
      {position && <h4>Position: {getPositionDisplayName(position, sportLeague)}</h4>}
      <div className="game">
        <div className="board">{renderCases()}</div>
        <div className="side">
          {renderInfo()}
          {renderActions()}
        </div>
      </div>
      <div className="contestant-flexbox">
        <div className="contestant-card">
          <p>{currentName}</p>
          {lineUp.map((lineUpData, index) => (
            <p key={index}><b>{getPositionDisplayName(lineUpData.position, sportLeague)}:</b> {lineUpData.playerName}</p>
          ))}
        </div>
      </div>
    </>
  );
};

export default Game;
