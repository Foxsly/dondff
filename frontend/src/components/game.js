import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {getCurrentUser} from "../api/auth";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

/**
 * LOGIC FLOW
 * User enters page. Find/create team. render boxes and player list.
 * Player selects a case. Eliminate boxes, display offer
 * Player declines offer. Eliminate boxes, display new offer
 *
 * What information do we need?
 * - The list of players in cases, which gets updated when offers are declined
 * - The cases themselves, which show the player in the case when that player has been eliminated
 * - The current offer, if available
 * - The next possible actions from the user
 */


// Game component that can accept a specific uid or default to the current user
const Game = ({teamUser, onComplete}) => {
  const {leagueId, season, week} = useLocation().state;
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentName, setCurrentName] = useState(null);
  const [cases, setCases] = useState(null);
  /**
   * boxNumber
   * boxStatus
   * if eliminated:
   * boxNumber
   * playerId
   * playerName
   * projetedPoints
   * injuryStatus
   * boxStatus = 'eliminated'
   */
  const [players, setPlayers] = useState(null);
  /**
   * playerId
   * playerName
   * projectedPoints
   * injuryStatus
   * boxStatus
   */
  const [offer, setOffer] = useState(null);
  /**
   * playerId
   * playerName
   * projectedPoints
   * injuryStatus
   * status = 'pending'
   */
  const [caseSelected, setCaseSelected] = useState(null);
  const [position, setPosition] = useState(null);
  const [lineUp, setLineUp] = useState([]);

  const [thinking, setThinking] = useState(false);
  const [reset, setReset] = useState(false);
  const [resetUsed, setResetUsed] = useState({RB: false, WR: false});
  const [teamId, setTeamId] = useState(null);
  const hasEnsuredTeamRef = React.useRef(false);
  const hasSetupGameRef = React.useRef(false);

  useEffect(() => {
    console.log("loadUserAndName useEffect", teamUser, getCurrentUser())
    const loadUserAndName = async () => {
      try {
        if(teamUser) {
          setCurrentUser(teamUser.user);
          setCurrentName(teamUser.user.name);
        } else {
          const currentUser = await getCurrentUser();
          setCurrentUser(currentUser);
          setCurrentName(currentUser.name);
        }
      } catch (err) {
        console.error("Failed to load current user/name for game", err);
      }
    };

    loadUserAndName();
  }, [teamUser, leagueId]);

  const ensureTeamForContext = useCallback(
    async (user) => {
      if (!user || !leagueId || !season || !week) {
        return null;
      }

      const userId = user.id || user.userId;
      if (!userId) return null;

      let resolvedTeamId = null;

      // 1. Try to find an existing team for this user/league/season/week
      try {
        const teamsRes = await fetch(`${API_BASE}/leagues/${leagueId}/teams`, {
          credentials: "include",
        });
        if (teamsRes.ok) {
          const teams = await teamsRes.json();
          if (Array.isArray(teams)) {
            const existing = teams.find((t) => {
              return (
                String(t.leagueId) === String(leagueId) &&
                String(t.userId) === String(userId) &&
                Number(t.seasonYear) === Number(season) &&
                Number(t.week) === Number(week)
              );
            });
            if (existing) {
              resolvedTeamId = existing.teamId || existing.id;
            }
          }
        } else {
          console.warn(
            "Failed to load teams for league in ensureTeamForContext",
            teamsRes.status
          );
        }
      } catch (err) {
        console.error("Error fetching league teams in ensureTeamForContext", err);
      }

      // 2. If no existing team, create one
      if (!resolvedTeamId) {
        try {
          const createRes = await fetch(`${API_BASE}/teams`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify({
              leagueId,
              userId,
              seasonYear: Number(season),
              week: Number(week),
            }),
          });
          if (!createRes.ok) {
            throw new Error(`Failed to create team (status ${createRes.status})`);
          }
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
    // Only run once per mount when we have user + context
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
      headers: {"Content-Type": "application/json"},
      credentials: "include",
    });
    
    console.log("TRACE: fetchTeamEntries response status:", getEntriesResponse.status);
    
    if (!getEntriesResponse.ok) {
      throw new Error(`Failed to fetch team entries (status ${getEntriesResponse.status})`);
    }
    
    const entries = await getEntriesResponse.json();
    console.log("TRACE: fetchTeamEntries received entries:", entries);
    
    if (!Array.isArray(entries)) {
      throw new Error("Invalid team entries data received from server");
    }
    
    if (entries.length === 0) {
      throw new Error("No team entries found - team may not be properly initialized");
    }
    
    return entries;
  }, [teamId]);

  const setupGame = useCallback(async () => {
    // Fetch all team entries to determine game state
    const entries = await fetchTeamEntries();

    // Find the first incomplete entry to resume
    let selectedPosition = null;
    
    for (const entry of entries) {
      if (entry.status !== 'finished') {
        selectedPosition = entry.position;
        break;
      }
    }
    
    // If no incomplete entries found, all positions are complete
    if (!selectedPosition) {
      console.error("TRACE: setupGame - all positions complete");
      throw new Error("All positions are already complete for this team");
    }
    
    setPosition(selectedPosition);

    // Initialize lineup based on all entries
    const initialLineup = entries.map(entry => ({
      position: entry.position,
      playerName: entry.playerName || 'awaiting game...',
      complete: entry.status === 'finished'
    }));
    setLineUp(initialLineup);
    
    // Now fetch cases for the selected position
    const getCasesResponse = await fetch(`${API_BASE}/teams/${teamId}/cases?position=${selectedPosition}`, {
      method: "GET",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
    });
    
    if (!getCasesResponse.ok) {
      throw new Error(`Failed to retrieve cases (status ${getCasesResponse.status})`);
    }
    const getCases = await getCasesResponse.json();
    setCases(getCases.boxes);
    setPlayers(getCases.players);
    const selectedCase = getCases.boxes.find(c => c.boxStatus === 'selected');
    setCaseSelected(selectedCase);

    //Don't retrieve an offer unless there is a case selected already
    if(selectedCase) {
      const getCurrentOffer = await fetch(`${API_BASE}/teams/${teamId}/offers?position=${selectedPosition}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
      });

      const currentOffer = await getCurrentOffer.json();
      setOffer(currentOffer);
    } else {
      console.log("TRACE: setupGame - no selected case, skipping offer fetch");
    }
    /* TODO - this isn't quite right, because we're not actually using `position`, but we need to trigger this
    *   effect when the position changes in order to setup the board properly. Should look into a separate effect that
    *   runs when the position changes and does the needful (whatever that means, my brain isn't firing on all cylinders)
    */
  }, [teamId, fetchTeamEntries, position]);

  useEffect(() => {
    console.log("TRACE: setupGame entry: ", hasSetupGameRef, teamId);
    // Only run once per mount to set up game
    if (hasSetupGameRef.current) return;
    if (!teamId) return;
    hasSetupGameRef.current = true;

    (async () => {
      console.log("calling setupGame");
      await setupGame();
    })();
  }, [teamId, setupGame]);

  const resetGameHandler = async () => {
    resetGame(position);
  };

  const resetGame = async (position) => {
    if (caseSelected || resetUsed[position]) return;
    const resetDto = {
      position: position,
    };
    const resetResponse = await fetch(`${API_BASE}/teams/${teamId}/cases/reset`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(resetDto),
    });

    const reset = await resetResponse.json();
    setCases(reset.boxes);
    setPlayers(reset.players);
    resetUsed[position] = true;
    setResetUsed(resetUsed);
    setReset(true);
  };

  const handleEliminatedCases = useCallback(
    eliminatedCases => {
      if (players && eliminatedCases) {
        for (const eliminatedCase of eliminatedCases) {
          const eliminatedPlayer = players.find(player => player.playerId === eliminatedCase.playerId);
          eliminatedPlayer.boxStatus = eliminatedCase.boxStatus;
        }
      }
      setPlayers([...players]);

      if (cases && eliminatedCases) {
        for (const eliminatedCase of eliminatedCases) {
          const eliminatedBox = cases.find(box => box.boxNumber === eliminatedCase.boxNumber);
          eliminatedBox.boxStatus = eliminatedCase.boxStatus;
          eliminatedBox.playerName = eliminatedCase.playerName;
          eliminatedBox.projectedPoints = eliminatedCase.projectedPoints;
          eliminatedBox.playerId = eliminatedCase.playerId;
        }
      }
      setCases([...cases]);
    }, [cases, players]);

  const selectCase = async (box) => {
    setCaseSelected(box);
    const selectCaseDto = {
      position: position,
      boxNumber: box.boxNumber
    }
    const selectCaseResponse = await fetch(`${API_BASE}/teams/${teamId}/cases`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(selectCaseDto),
    });

    const selectCase = await selectCaseResponse.json();
    setOffer(selectCase.offer);
    handleEliminatedCases(selectCase.boxes);
  };

  const declineOffer = async () => {
    const declineOfferDto = {
      position: position,
    }
    const declineOfferResponse = await fetch(`${API_BASE}/teams/${teamId}/offers/reject`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(declineOfferDto),
    });

    const declineOffer = await declineOfferResponse.json();
    setOffer(declineOffer.offer);
    handleEliminatedCases(declineOffer.boxes);
  };


  //KEEP - CLEANUP
  const acceptOffer = async () => {
    const acceptOfferDto = {
      position: position,
    }
    const acceptOfferResponse = await fetch(`${API_BASE}/teams/${teamId}/offers/accept`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(acceptOfferDto),
    });
    const acceptedOffer = await acceptOfferResponse.json();
    const casesToEliminate = acceptedOffer.boxes.map((box) => {
      //Simulate the remaining cases all being 'eliminated'
      return {
        ...box,
        boxStatus: 'eliminated'
      }
    });
    handleEliminatedCases(casesToEliminate);
    setOffer({...offer, status: 'accepted'});
    console.log("lineup: ", lineUp, "position:", position);
    const lineUpPosition = lineUp.find(value => value.position === position);
    lineUpPosition.playerName = offer.playerName;
    lineUpPosition.complete = true;
  };

  //KEEP - CLEANUP
  const keep = useCallback(async () => {
    const finalDecisionDto = {
      position: position,
      decision: 'keep',
    }
    const finalDecisionResponse = await fetch(`${API_BASE}/teams/${teamId}/offers`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(finalDecisionDto),
    });
    const finalDecision = await finalDecisionResponse.json();
    const boxes = finalDecision.boxes;
    const selectedPlayer = boxes.find((box) => box.boxStatus === 'selected');
    handleEliminatedCases(boxes);
    const lineUpPosition = lineUp.find(value => value.position === position);
    lineUpPosition.playerName = selectedPlayer.playerName;
    lineUpPosition.complete = true;
    setCaseSelected(selectedPlayer);
    setOffer(null);
  }, [handleEliminatedCases, lineUp, position, teamId]);

  //KEEP - CLEANUP
  const swap = useCallback(async () => {
    const finalDecisionDto = {
      position: position,
      decision: 'swap',
    }
    const finalDecisionResponse = await fetch(`${API_BASE}/teams/${teamId}/offers`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(finalDecisionDto),
    });

    const finalDecision = await finalDecisionResponse.json();
    const boxes = finalDecision.boxes;
    const selectedPlayer = boxes.find((box) => box.boxStatus === 'swapped');
    const updatedBoxes = boxes.map((box) => {
      const newBoxStatus = box.boxStatus === 'selected' ? 'eliminated' : box.boxStatus === 'swapped' ? 'selected' : box.boxStatus;
      return {
        ...box,
        boxStatus: newBoxStatus
      }
    });
    //A little hacky, but set the swapped case to the selected case and eliminate the selected case
    handleEliminatedCases(updatedBoxes);
    const lineUpPosition = lineUp.find(value => value.position === position);
    lineUpPosition.playerName = selectedPlayer.playerName;
    lineUpPosition.complete = true;
    setCaseSelected(selectedPlayer);
    setOffer(null);
  }, [handleEliminatedCases, lineUp, position, teamId]);

  const advanceToNextPosition = async () => {
    console.log("TRACE: advanceToNextPosition called, current position:", position);
    // Fetch all team entries to find the next incomplete position
    const entries = await fetchTeamEntries();
    console.log("TRACE: advanceToNextPosition received entries:", entries);
    
    // Find the next incomplete position (different from current position)
    let nextPosition = null;
    let foundCurrent = false;
    
    for (const entry of entries) {
      if (entry.position === position) {
        foundCurrent = true;
        console.log("TRACE: advanceToNextPosition found current position:", position);
        continue; // Skip the current position
      }
      
      if (entry.status !== 'finished') {
        nextPosition = entry.position;
        console.log("TRACE: advanceToNextPosition found next position:", nextPosition);
        break;
      }
    }
    
    // If we didn't find the current position in the entries, that's an error
    if (!foundCurrent) {
      console.error("TRACE: advanceToNextPosition - current position not found:", position);
      throw new Error(`Current position ${position} not found in team entries`);
    }
    
    // If we found a position, switch to it
    if (nextPosition) {
      console.log("TRACE: advanceToNextPosition switching to position:", nextPosition);
      setPosition(nextPosition);
      setOffer(null);
      setPlayers(null);
      setCases(null);
      setCaseSelected(null);
      hasSetupGameRef.current = false;
    } else {
      // All positions are complete - this shouldn't happen in normal gameplay
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
    const showAllCases = players && players.filter(player => player.boxStatus === 'available').length === 0;
    console.log("rendering cases", cases, caseSelected, players, showAllCases);
    if (cases && caseSelected) {
      return (
        <>
          {cases.map((box, index) => ((box.boxStatus === 'available' || box.boxStatus === 'selected') && !showAllCases ?
              <div className="box" key={box.boxNumber}>
                <span className="num">{box.boxNumber}</span>
              </div>
              :
              <div className="box opened" key={box.boxNumber}>
                {box.boxNumber}<br/>
                {box.playerName}({box.projectedPoints})
              </div>
          ))}
        </>
      );
    } else if (cases) {
      return (
        <>
          {cases.map((box, index) =>
            <div className="box" key={box.boxNumber} onClick={() => selectCase(box)}>
              <span className="num">{box.boxNumber}</span>
            </div>
          )}
        </>
      );
    }
  };

  //TODO need to return team and opponent (or retrieve that and use it for rendering purposes)
  const renderPlayerList = () => {
    console.log("rendering player list", players)
    if (players) {
      return (
        <div className="display-cases">
          Players in cases:
          {players.map((player, index) => (
              player.boxStatus === 'available' || player.boxStatus === 'selected' ?
                <div className="list-player" key={player.playerId}>{player.playerName} <span className="status">{player.matchup.team} {player.injuryStatus}</span><br/>
                  <span className="proj">Proj: {player.projectedPoints} Opp: {player.matchup.opponent}</span></div>
                :
                <div className="list-player eliminated" key={player.playerId}>{player.playerName} <span
                  className="status">{player.matchup.team} {player.status}</span><br/>
                  <span className="proj">Proj: {player.projectedPoints} Opp: {player.matchup.opponent}</span></div>
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

          {!thinking && players ?
            <>{renderPlayerList()}</> : null
          }
        </>
      );
    }
  };

  const renderActions = () => {
    const keepOrSwap = players && players.filter(player => player.boxStatus === 'available').length === 2;
    const remainingCase = cases && caseSelected && cases.find(c => c.boxStatus === 'available' && c.boxNumber !== caseSelected.boxNumber);
    const allPositionsDone = lineUp && lineUp.every(lu => lu.complete === true);
    if (offer && offer.status === 'pending' && !keepOrSwap) {
      return (
        <div className="action-box">
          <div className="offer-box">The Banker offers you:
            <div className="list-player">{offer.playerName} <span className="status">{offer.matchup.team} {offer.injuryStatus}</span><br/>
              <span className="proj">Proj: {offer.projectedPoints} Opp: {offer.matchup.opponent}</span></div>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={acceptOffer}>Accept</button>
            <button className="btn" onClick={declineOffer}>Decline</button>
            <button className="btn" onClick={resetGameHandler}
                    disabled={caseSelected || resetUsed[position]}>Reset
            </button>
          </div>
        </div>
      );
    } else if (offer && keepOrSwap) {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You have rejected all offers and there is one more case remaining: #{remainingCase.boxNumber}.</p>
            <p>Would you like to keep your original case or swap with the last remaining?</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={keep}>Keep</button>
            <button className="btn" onClick={swap}>Swap</button>
            <button className="btn" onClick={resetGameHandler}
                    disabled={caseSelected || resetUsed[position]}>Reset
            </button>
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
            {allPositionsDone ?
              <button className="btn" onClick={submitLineup}>Submit Lineup</button> :
              <button className="btn" onClick={advanceToNextPosition}>Switch Position Group</button>}
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
            {allPositionsDone ?
              <button className="btn" onClick={submitLineup}>Submit Lineup</button> :
              <button className="btn" onClick={advanceToNextPosition}>Switch Position Group</button>}
          </div>
        </div>
      );
    } else {
      return (
        <div className="action-buttons">
          <button className="btn" onClick={resetGameHandler} disabled={caseSelected || resetUsed[position]}>Reset</button>
          {allPositionsDone ?
            <button className="btn" onClick={submitLineup}>Submit Lineup</button> :
            <button className="btn" onClick={advanceToNextPosition}>Switch Position Group</button>}
        </div>
      );
    }
  };

  return (
    <>
      <h3>Current User: {currentName}</h3>
      <div className="game">
        <div className="board">
          {renderCases()}
        </div>
        <div className="side">
          {renderInfo()}
          {renderActions()}
        </div>
      </div>
      <div className="contestant-flexbox">
        <div className="contestant-card">
          <p>{currentName}</p>
          {lineUp.map((lineUpData, index) => {
            return <p><b>{lineUpData.position}:</b> {lineUpData.playerName}</p>
          })}
        </div>
      </div>
    </>
  );
};

export default Game;
