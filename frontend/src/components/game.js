import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {getPlayers} from './util';
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

  const [round, setRound] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [reset, setReset] = useState(false);
  const [finished, setFinished] = useState(false);
  const [midway, setMidway] = useState(false);
  const [type, setType] = useState("RB");
  const [limit, setLimit] = useState(65);
  const [pool, setPool] = useState([]);
  const [lineUp, setLineUp] = useState({
    RB: {name: "awaiting game..."},
    WR: {name: "awaiting game..."},
  });
  const [resetUsed, setResetUsed] = useState({RB: false, WR: false});
  const [teamId, setTeamId] = useState(null);
  const hasEnsuredTeamRef = React.useRef(false);

  useEffect(() => {
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

  //KEEP?
  const retrieveCases = useCallback(async () => {
    console.log("inside retrieveCases")
    if(!teamId) return;
    const getCasesRes = await fetch(`${API_BASE}/teams/${teamId}/cases?position=${type}`, {
      method: "GET",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
    });
    if (!getCasesRes.ok) {
      throw new Error(`Failed to retrieve cases (status ${getCasesRes.status})`);
    }
    const getCases = await getCasesRes.json();
    setCases(getCases.boxes);

    /*
        "number" : index + 1,
        "name" : player.name,
        "points" : player.points,
        "opened" : false,
        "status" : player.status,
        "opponent" : player.opponent,
        "team" : player.team,
        "playerId" : player.playerId
      }
     */

    //call /teams/:teamId/cases and pull the cases from there
    // setCases(generateCases(pool, 10));
  }, [teamId, type]);

  //KEEP
  const buildDisplayCases = async () => {
    const getCasesRes = await fetch(`${API_BASE}/teams/${teamId}/cases?position=${type}`, {
      method: "GET",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
    });
    if (!getCasesRes.ok) {
      throw new Error(`Failed to retrieve cases (status ${getCasesRes.status})`);
    }
    const serverCases = await getCasesRes.json();
    setPlayers(serverCases.players);
  };

  //KEEP
  const resetGameHandler = () => {
    resetGame(true, type);
  };

  //KEEP - CLEANUP
  const resetGame = async (consume = true, position) => {
    if (consume && (caseSelected || resetUsed[position])) return;
    if (consume) {
      const resetDto = {
        position: type,
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
    setMidway(false);
    setLineUp(prev => ({...prev, [position]: {name: "awaiting game..."}}));
  };

  const selectCase = async (box) => {
    setCaseSelected(box);
    const selectCaseDto = {
      position: type,
      boxNumber: box.number
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
      position: type,
    }
    const declineOfferResponse = await fetch(`${API_BASE}/teams/${teamId}/offers/reject`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(declineOfferDto),
    });

    const declineOffer = await declineOfferResponse.json();
    //TODO handle final offer (only two cases remaining - don't give them an offer, go to keep/swap).
    setOffer(declineOffer.offer);
    handleEliminatedCases(declineOffer.boxes);
  };

  //KEEP - CLEANUP
  const acceptOffer = async () => {
    const accepted = offer;
    const acceptOfferDto = {
      position: type,
    }
    const acceptOfferResponse = await fetch(`${API_BASE}/teams/${teamId}/offers/accept`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(acceptOfferDto),
    });
    //TODO do something with the response
  };

  //KEEP - CLEANUP
  const keep = useCallback(async () => {
    const finalDecisionDto = {
      position: type,
      decision: 'keep',
    }
    const finalDecisionResponse = await fetch(`${API_BASE}/teams/${teamId}/offers`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(finalDecisionDto),
    });
    //TODO do something with the response
  }, [type, teamId]);

  //KEEP - CLEANUP
  const swap = useCallback(async () => {
    const finalDecisionDto = {
      position: type,
      decision: 'swap',
    }
    const finalDecisionResponse = await fetch(`${API_BASE}/teams/${teamId}/offers`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "include",
      body: JSON.stringify(finalDecisionDto),
    });
    //TODO do something with the response
  }, [type, teamId]);

  function handleEliminatedCases(eliminatedCases) {
    if (players && eliminatedCases) {
      for (const eliminatedCase of eliminatedCases) {
        const eliminatedPlayer = players.find(player => player.playerId === eliminatedCase.playerId);
        eliminatedPlayer.boxStatus = eliminatedCase.boxStatus;
      }
    }

    if (cases && eliminatedCases) {
      for (const eliminatedCase of eliminatedCases) {
        const eliminatedBox = cases.find(box => box.boxNumber === eliminatedCase.boxNumber);
        eliminatedBox.boxStatus = eliminatedCase.boxStatus;
        eliminatedBox.playerName = eliminatedCase.playerName;
        eliminatedBox.projectedPoints = eliminatedCase.projectedPoints;
        eliminatedBox.playerId = eliminatedCase.playerId;
      }
    }
  }

  //OLD - REFACTOR
  const swapPosition = () => {
    setPool([]);
    setType("WR");
    console.log("TYPE", type);
    setLimit(95);
    resetGame(false, "WR");
    setFinished(true);
  };

  //TBD
  const submitLineup = async () => {
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

  //OLD
  useEffect(() => {
    console.log("inside setLimit useEffect");
    if (type === "WR") {
      setLimit(95);
    }
    if (type === "RB") {
      setLimit(65);
      console.log("position group is ", type);
    }
  }, [type]);


  //OLD - entry?
  useEffect(() => {
    console.log("inside getPlayers useEffect")
    if (limit) {
      getPlayers(week, type, season, limit, setPool);
    }
  }, [limit]);

  //OLD - entry?
  useEffect(() => {
    console.log("inside retrieveCases useEffect")

    if (pool.length > 0 && !cases) {
      console.log("pool when cases try to build", pool);
      retrieveCases();

    }
  }, [cases, pool, retrieveCases]);

  //OLD - entry?
  useEffect(() => {
    console.log("inside buildDisplayCases useEffect")

    if (cases && !players) {
      buildDisplayCases();
    }
  }, [cases, players]);

  //OLD
  useEffect(() => {
    console.log("inside round switch useEffect")

    //TODO figure out how to do this differently
    if (round === 5) {
      setLineUp(prev => ({...prev, [type]: caseSelected}));
      setMidway(true);
    }
  }, [round, caseSelected, type]);

  //OLD - entry?
  useEffect(() => {
    console.log("inside if-reset useEffect")

    if (reset) {
      setCases(null);
      setCaseSelected(null);
      setRound(0);
      setThinking(false);
      setOffer(null);
      setPlayers(null);
      setReset(false);

    }
  }, [reset]);

  const renderCases = () => {
    if (cases && caseSelected) {
      return (
        <>
          {cases.map((box, index) => (box.boxStatus === 'available' ?
              <div className="box" key={index}>
                <span className="num">{box.boxNumber}</span>
              </div>
              :
              <div className="box opened" key={index}>
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
            <div className="box" key={index} onClick={() => selectCase(cases[index])}>
              <span className="num">{index+1}</span>
            </div>
          )}
        </>
      );
    }
  };

  //TODO need to return team and opponent (or retrieve that and use it for rendering purposes)
  const renderPlayerList = () => {
    if (players) {
      return (
        <div className="display-cases">
          Players in cases:
          {players.map((player, index) => (
              player.boxStatus === 'available' ?
                <div className="list-player">{player.playerName} <span className="status">{player.team} {player.injuryStatus}</span><br/>
                  <span className="proj">Proj: {player.projectedPoints} Opp: {player.opponent}</span></div>
                :
                <div className="list-player eliminated">{player.playerName} <span
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
          <div className="case-selected-text">You have selected case #{caseSelected.number}</div>
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
    if (offer && !keepOrSwap) {
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
                    disabled={caseSelected !== null || resetUsed[type]}>Reset
            </button>
          </div>
        </div>
      );
    } else if (offer && keepOrSwap) {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You have rejected all offers and there is one more case remaining: DERIVE THE CASE NUMBER.</p>
            <p>Would you like to keep your original case or swap with the last remaining?</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={keep}>Keep</button>
            <button className="btn" onClick={swap}>Swap</button>
            <button className="btn" onClick={resetGameHandler}
                    disabled={caseSelected !== null || resetUsed[type]}>Reset
            </button>
          </div>
        </div>
      );
    } else if (offer && round === 5) {
      return (
        <div className="action-box">
          <div className="offer-box">
            {caseSelected.number ? <p>Your Final case is case#{caseSelected.number}</p> :
              <p>You accepted the Banker's offer.</p>}
            <p>Congratulations!! Your player is {caseSelected.name}. His projected points are {caseSelected.points}</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={resetGameHandler}
                    disabled={caseSelected !== null || resetUsed[type]}>Reset
            </button>
            {midway ? (finished ? <button className="btn" onClick={submitLineup}>Submit Lineup</button> :
              <button className="btn" onClick={swapPosition}>Switch Position Group</button>) : null}
          </div>
        </div>
      );
    } else {
      return (
        <div className="action-buttons">
          <button className="btn" onClick={resetGameHandler} disabled={caseSelected !== null || resetUsed[type]}>Reset
          </button>
          {midway ? (finished ? <button className="btn" onClick={submitLineup}>Submit Lineup</button> :
            <button className="btn" onClick={swapPosition}>Switch Position Group</button>) : null}
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
          <p><b>RB:</b> {lineUp.RB.name}</p>
          <p><b>WR:</b> {lineUp.WR.name}</p>
        </div>
      </div>
    </>
  );
};

export default Game;
