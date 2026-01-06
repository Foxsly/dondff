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
  const [position, setPosition] = useState("RB");
  const [lineUp, setLineUp] = useState([
    {position: 'RB', playerName: 'awaiting game...', complete: false},
    {position: 'WR', playerName: 'awaiting game...', complete: false},
  ]);

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

  const setupGame = useCallback(async () => {
    //TODO get all entries (/teams/{teamId}/entry with no position query) and figure out what position to start at
    const getCasesResponse = await fetch(`${API_BASE}/teams/${teamId}/cases?position=${position}`, {
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
    setCaseSelected(selectedCase)

    //Don't retrieve an offer unless there is a case selected already
    if(selectedCase) {
      const getCurrentOffer = await fetch(`${API_BASE}/teams/${teamId}/offers?position=${position}`, {
        method: "GET",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
      });

      const currentOffer = await getCurrentOffer.json();
      console.log(currentOffer);
      setOffer(currentOffer);
    }
  }, [position, teamId]);

  useEffect(() => {
    // Only run once per mount to set up game
    if (hasSetupGameRef.current) return;
    if (!teamId || !position) return;
    hasSetupGameRef.current = true;

    (async () => {
      await setupGame();
    })();
  }, [teamId, position, setupGame]);

  //KEEP
  const resetGameHandler = () => {
    resetGame(true, position);
  };

  //KEEP - CLEANUP
  const resetGame = async (consume = true, position) => {
    if (consume && (caseSelected || resetUsed[position])) return;
    if (consume) {
      const resetDto = {
        position: position,
      }
      const resetResponse = await fetch(`${API_BASE}/teams/${teamId}/cases/reset`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(resetDto),
      });
      resetUsed[position] = true;
      setResetUsed(resetUsed);
    }
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

  const advanceToNextPosition = () => {
    if(position === 'RB') {
      setPosition('WR');
    }
    setOffer(null);
    setPlayers(null);
    setCases(null);
    setCaseSelected(null);
  };



  //TBD
  const submitLineup = async () => {
    console.log("submitLineup");
    try {
      // Ensure we have a user; if not yet loaded, try to fetch again
      let user = currentUser;
      if (!user) {
        try {
          user = await getCurrentUser();
          setCurrentUser(user || null);
        } catch (e) {
          console.error("Failed to resolve current user before submitLineup", e);
        }
      }

      const userId = user?.id || user?.userId;
      if (!userId) {
        console.error("No user id available for submitLineup", user);
        alert("Unable to determine your user account. Please sign in again.");
        return;
      }

      if (!leagueId || !season || !week) {
        console.error("Missing league/season/week context for submitLineup", {
          leagueId,
          season,
          week,
        });
        alert("Missing league/season/week information. Please navigate back and try again.");
        return;
      }

      if (!teamId) {
        console.error("submitLineup: teamId could not be resolved or created");
        alert("Could not resolve a team to attach your lineup to.");
        return;
      }

      // 3. Upsert RB/WR players into the team via upsertTeamPlayer
      const rb = lineUp.RB;
      const wr = lineUp.WR;

      const upsertPlayer = async (position, player) => {
        if (!player || !player.playerId || !player.name) return;
        const dto = {
          teamId,
          position,
          playerId: player.playerId,
          playerName: player.name,
        };
        const res = await fetch(`${API_BASE}/teams/${teamId}/players`, {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          credentials: "include",
          body: JSON.stringify(dto),
        });
        if (!res.ok) {
          throw new Error(
            `Failed to upsert ${position} for team ${teamId} (status ${res.status})`
          );
        }
      };

      await upsertPlayer("RB", rb);
      await upsertPlayer("WR", wr);

      if (onComplete) {
        onComplete();
      } else {
        navigate(-1);
      }
    } catch (err) {
      console.error("Unexpected error during submitLineup", err);
      alert("There was a problem saving your lineup. Please try again.");
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
                <div className="list-player" key={player.playerId}>{player.playerName} <span className="status">{player.team} {player.injuryStatus}</span><br/>
                  <span className="proj">Proj: {player.projectedPoints} Opp: {player.opponent}</span></div>
                :
                <div className="list-player eliminated" key={player.playerId}>{player.playerName} <span
                  className="status">{player.team} {player.status}</span><br/>
                  <span className="proj">Proj: {player.projectedPoints} Opp: {player.opponent}</span></div>
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
            <div className="list-player">{offer.playerName} <span className="status">{offer.team} {offer.injuryStatus}</span><br/>
              <span className="proj">Proj: {offer.projectedPoints} Opp: {offer.opponent}</span></div>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={acceptOffer}>Accept</button>
            <button className="btn" onClick={declineOffer}>Decline</button>
            <button className="btn" onClick={resetGameHandler}
                    disabled={caseSelected !== null || resetUsed[position]}>Reset
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
                    disabled={caseSelected !== null || resetUsed[position]}>Reset
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
            <button className="btn" onClick={resetGameHandler}
                    disabled={caseSelected !== null || resetUsed[position]}>Reset
            </button>
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
          <button className="btn" onClick={resetGameHandler} disabled={caseSelected !== null || resetUsed[position]}>Reset
          </button>
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
