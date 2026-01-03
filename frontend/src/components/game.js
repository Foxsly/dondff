import React, {useEffect, useState, useCallback} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {getPlayers, generateCases} from './util';
import {getCurrentUser} from "../api/auth";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

// Game component that can accept a specific uid or default to the current user
const Game = ({teamUser, onComplete}) => {
  const {leagueId, season, week} = useLocation().state;
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentName, setCurrentName] = useState(null);
  const [cases, setCases] = useState(null);
  const [caseSelected, setCaseSelected] = useState(null);
  const [gameCases, setGameCases] = useState(null);
  const [round, setRound] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [removedCases, setRemovedCases] = useState(null);
  const [offer, setOffer] = useState(null);
  const [reset, setReset] = useState(false);
  const [leftovers, setLeftovers] = useState(null);
  const [displayCases, setDisplayCases] = useState(null);
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

  //KEEP
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

  //KEEP
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

  //KEEP
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

  //OLD
  const retrieveCases = useCallback(async () => {
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

  //OLD
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
    setDisplayCases(serverCases.players);
    //TODO probably need to map players to the front-end format - this is used in renderCaseDisplay
  };

  //OLD
  const buildLeftovers = async () => {
    const genLeftovers = (arr) => {
      //console.log("genLeftovers fired, state is gonna set")
      let copyPool = [...pool];
      let copyCases = arr;

      for (let item of copyCases) {
        copyPool = copyPool.filter((player) => {
          if (player.name !== item.name) {
            return player;
          }
        });
      }

      return copyPool;
    };
    const realLeftovers = await genLeftovers(cases);
    //console.log("leftover cases generated: ", realLeftovers)
    setLeftovers(realLeftovers);

  };

  //OLD
  const removeOfferFromLeftovers = (offer) => {
    let offerToRemoveIndex = leftovers.findIndex(player => player.playerId == offer.playerId);
    if (offerToRemoveIndex !== -1) {
      leftovers.splice(offerToRemoveIndex, 1);
    }
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

  //OLD
  const removeCases = (arr, n) => {
    var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
    if (n > len)
      throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
      var x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
  };

  //KEEP - CLEANUP
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
    const newOffer = selectCase.offer;
    /*
      offerId	"c5e8ba32-60a5-420d-a0e8-c50f7513c0f2"
      teamEntryId	"c6562e40-d0a0-4a55-93eb-3ce970c64b66"
      playerId	"9224"
      playerName	"Chase Brown"
      injuryStatus	null
      projectedPoints	14.72
     */
    setOffer(newOffer);
    const eliminatedCases = selectCase.boxes;
    /*
      auditId	"15f3ed59-e113-4d96-9b5b-a46914cc4a84"
      teamEntryId	"c6562e40-d0a0-4a55-93eb-3ce970c64b66"
      resetNumber	0
      boxNumber	4
      playerId	"11199"
      playerName	"Emari Demercado"
      projectedPoints	7.34
      injuryStatus	null
      boxStatus
     */
    if (displayCases && eliminatedCases) {
      const updatedDisplayCases = displayCases.map(displayPlayer => {
        const eliminatedCase = eliminatedCases.find(ec => ec.playerId === displayPlayer.playerId);
        if (eliminatedCase) {
          return {
            ...displayPlayer,
            boxStatus: eliminatedCase.boxStatus
          };
        }
        return displayPlayer;
      });
      setDisplayCases(updatedDisplayCases);
    }

    // TODO - iterate through cases, match to eliminatedCases by playerId, and update the boxStatus, then re-set the value on cases
  };

  //TBD?
  const cleanUpCaseDisplay = useCallback(async (lastRemaining) => {
    let copyCases = cases;
    let copyDisplayCases = displayCases;

    copyCases = copyCases.map((box) => {
      if (box.name === lastRemaining.name) {
        return {...box, opened: true};
      }
      return box;
    });

    copyDisplayCases = copyDisplayCases.map((box) => {
      if (box.name === lastRemaining.name) {
        return {...box, opened: true};
      }
      return box;
    });

    setCases(copyCases);
    setDisplayCases(copyDisplayCases);
  }, [cases, displayCases]);

  //TBD?
  const cleanAllCases = useCallback(async (lastRemaining) => {
    let copyCases = cases;
    let copyDisplayCases = displayCases;

    copyCases = copyCases.map((box) => {
      return {...box, opened: true};
    });

    copyDisplayCases = copyDisplayCases.map((box) => {
      return {...box, opened: true};
    });

    setCases(copyCases);
    setDisplayCases(copyDisplayCases);
  }, [cases]);

  //KEEP - CLEANUP
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
    removeOfferFromLeftovers(offer);
    setRound(round + 1);
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
    const lastRemaining = gameCases[0];
    setRemovedCases(removedCases => [...removedCases, lastRemaining]);
    cleanUpCaseDisplay(lastRemaining);
    setRound(round + 1);
  }, [gameCases, round, cases]);

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
    const lastRemaining = gameCases[0];
    const ogSelected = caseSelected;
    setRemovedCases(removedCases => [...removedCases, ogSelected]);
    setCaseSelected(lastRemaining);
    cleanUpCaseDisplay(ogSelected);
    setRound(round + 1);
  }, [gameCases, round, cases]);

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
    setRemovedCases(cases);
    setCaseSelected(accepted);
    cleanAllCases();
    setRound(5);
  };

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
    if (limit) {
      getPlayers(week, type, season, limit, setPool);
    }
  }, [limit]);

  //OLD - entry?
  useEffect(() => {
    if (pool.length > 0 && !cases) {
      console.log("pool when cases try to build", pool);
      retrieveCases();

    }
  }, [cases, pool, retrieveCases]);

  //OLD
  useEffect(() => {
    if (cases && leftovers === null) {
      buildLeftovers();
    }
  }, [cases, leftovers]);

  //OLD - entry?
  useEffect(() => {
    if (cases && !displayCases) {
      buildDisplayCases();
    }
  }, [cases, displayCases]);

  //OLD
  useEffect(() => {
    //TODO figure out how to do this differently
    if (round === 5) {
      setLineUp(prev => ({...prev, [type]: caseSelected}));
      setMidway(true);
    }
  }, [round, caseSelected, type]);

  //OLD - entry?
  useEffect(() => {
    if (reset) {
      setLeftovers(null);
      setCases(null);
      setCaseSelected(null);
      setGameCases(null);
      setRound(0);
      setThinking(false);
      setRemovedCases(null);
      setOffer(null);
      setDisplayCases(null);
      setReset(false);

    }
  }, [reset]);

  const render = () => {
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
                {box.name}({box.points})
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

  //TODO need to return team and oppoonent (or retrieve that and use it for rendering purposes)
  const renderCaseDisplay = () => {
    if (displayCases) {
      return (
        <div className="display-cases">
          Players in cases:
          {displayCases.map((player, index) => (
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
          {renderCaseDisplay()}
        </>
      );
    }
    if (caseSelected) {
      return (
        <>
          <div className="case-selected-text">You have selected case #{caseSelected.number}</div>
          {thinking ? <div>Eliminating Cases...</div> : <div></div>}

          {!thinking && displayCases ?
            <>{renderCaseDisplay()}</> : null
          }
        </>
      );
    }

  };

  const renderActions = () => {
    if (offer && round <= 3) {
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
    } else if (offer && round === 4) {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You have rejected all offers and there is one more case remaining: {gameCases[0].number}.</p>
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
          {render()}
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
