import React, { useEffect, useState, useCallback} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth, db } from "../firebase-config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getPlayers, generateCases } from './util';

// Game component that can accept a specific uid or default to the current user
const Game = ({ uid, onComplete }) => {


  const { leagueId, season, week } = useLocation().state
  const navigate = useNavigate()
  const currentUid = uid || auth.currentUser?.uid
  const [currentName, setCurrentName] = useState(currentUid)

  const [cases, setCases] = useState(null)
  const [caseSelected, setCaseSelected] = useState(null)
  const [gameCases, setGameCases] = useState(null)
  const [round, setRound] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [removedCases, setRemovedCases] = useState(null)
  const [offer, setOffer] = useState(null)
  const [reset, setReset] = useState(false)
  const [leftovers, setLeftovers] = useState(null)
  const [displayCases, setDisplayCases] = useState(null)
  const [finished, setFinished] = useState(false)
  const [midway, setMidway] = useState(false)
  const [type, setType] = useState("RB")
  const [limit, setLimit] = useState(65)
  const [pool, setPool] = useState([])
  const [lineUp, setLineUp] = useState({
    RB: { name: "awaiting game..." },
    WR: { name: "awaiting game..." },
  })
  const [resetUsed, setResetUsed] = useState({ RB: false, WR: false })

  useEffect(() => {
    const fetchName = async () => {
      if (!currentUid) return
      if (uid) {
        try {
          const memberRef = doc(db, "leagues", leagueId, "members", currentUid)
          const memberSnap = await getDoc(memberRef)
          const data = memberSnap.data()
          setCurrentName(data?.displayName || data?.name || data?.uid || currentUid)
        } catch (e) {
          setCurrentName(currentUid)
        }
      } else {
        setCurrentName(auth.currentUser?.displayName || auth.currentUser?.email || currentUid)
      }
    }
    fetchName()
  }, [uid, currentUid, leagueId])

  const buildCases = useCallback(async () => {
    setCases(generateCases(pool, 10))
  }, [pool])

  const buildDisplayCases = () => {
    let copy = [...cases]
    function shuffle(array) {
      let currentIndex = array.length,  randomIndex;
    
      // While there remain elements to shuffle.
      while (currentIndex !== 0) {
    
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
    
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex], array[currentIndex]];
      }
    
      return array;
    }
    shuffle(copy)
    setDisplayCases(copy)
  }

  const buildLeftovers = async () => {
    const genLeftovers = (arr) => {
      //console.log("genLeftovers fired, state is gonna set")
      let copyPool = [...pool]
      let copyCases = arr

      for(let item of copyCases) {
        copyPool = copyPool.filter((player) => {
          if (player.name !== item.name) {
            return player
          }
        })
      }
      
      return copyPool
    }
    const realLeftovers = await genLeftovers(cases)
    //console.log("leftover cases generated: ", realLeftovers)
    setLeftovers(realLeftovers)
    
  }

  const removeOfferFromLeftovers = (offer) => {
    let offerToRemoveIndex = leftovers.findIndex(player => player.playerId == offer.playerId);
    if (offerToRemoveIndex !== -1) {
      leftovers.splice(offerToRemoveIndex, 1);
    }
  }

  const resetGameHandler = () => {
    resetGame(true, type);
  };

  const resetGame = (consume = true, position) => {
    if (consume && (caseSelected || resetUsed[position])) return
    if (consume) {
      resetUsed[position] = true;
      setResetUsed(resetUsed);
    }
    setReset(true)
    setMidway(false)
    setLineUp(prev => ({ ...prev, [position]: { name: "awaiting game..." } }))
  }
  
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
    return result
  }
  
  const selectCase = (box) => {
    setCaseSelected(box)
    const copy = [...cases]
    const index = copy.indexOf(box)
    copy.splice(index, 1)
    setGameCases(copy)
    setRound(1)
  }

  const elimCases = useCallback(async (num) => {
    setThinking(true)
    const latestCases = gameCases
    const removed = removeCases(latestCases, num)
    setThinking(false)
    if (removedCases) {
      for (let item of removed) {
        setRemovedCases(removedCases => [...removedCases, item])
      }
    } else {
      setRemovedCases(removed)
    }
    let copyOrigCases = cases
    let copyDisplayCases = displayCases
    for(let i= 0; i<removed.length; i++) {
      let copy = gameCases
      let index = copy.indexOf(removed[i])
      copy.splice(index, 1)
      //console.log("found item at index: ", index)
      await setGameCases(copy)
      //console.log("intercepting...new game cases are: ", gameCases)

      
      copyOrigCases = copyOrigCases.map((box) => {
        if(box.name === removed[i].name) {
          return {...box, opened: true}
        }
        return box
      })

      copyDisplayCases = copyDisplayCases.map((box) => {
        if(box.name === removed[i].name) {
          return {...box, opened: true}
        }
        return box
      })
      
      
    }
    //console.log("the new copy of cases should be:", copyOrigCases)
    setCases(copyOrigCases)
    setDisplayCases(copyDisplayCases)

    if(round <= 3) {
    buildOffer(gameCases, caseSelected)
    }
  }, [gameCases, removedCases, round, cases, displayCases, caseSelected])

  const buildOffer = async (arr, toAdd) => {
    const latestCases = [...arr, toAdd]
    const len = latestCases.length
    //console.log("the cases used for calculating offer are: ", latestCases)
    let offer = latestCases.reduce((prev, curr) => {
      return prev + Math.pow(curr.points, 2)
    }, 0)
    offer = Math.sqrt(offer/len)
    offer = Math.round(offer * 100) / 100
    console.log(offer)
    //console.log("leftovers to select offer from", leftovers)

    const getClosestPoints = (data, target) => 
      data.reduce((acc, obj) =>
        Math.abs(target - obj.points) < Math.abs(target - acc.points) ? obj : acc
    );
    const playerOffer = getClosestPoints(leftovers, offer)
    //console.log("your selected case is: ", caseSelected)
    console.log("the player to be offered is: ", playerOffer)

    setOffer(playerOffer)
  }

  const cleanUpCaseDisplay = useCallback(async (lastRemaining) => {
    let copyCases = cases
    let copyDisplayCases = displayCases
    
      copyCases = copyCases.map((box) => {
        if(box.name === lastRemaining.name) {
            return {...box, opened: true}
        }
          return box
        })

      copyDisplayCases = copyDisplayCases.map((box) => {
        if(box.name === lastRemaining.name) {
          return {...box, opened: true}
        }
        return box
      })
    
    setCases(copyCases)
    setDisplayCases(copyDisplayCases)
  }, [cases, displayCases])

  const cleanAllCases = useCallback(async (lastRemaining) => {
    let copyCases = cases
    let copyDisplayCases = displayCases
    
      copyCases = copyCases.map((box) => {
            return {...box, opened: true}
        })

        copyDisplayCases = copyDisplayCases.map((box) => {
          return {...box, opened: true}
        })

    setCases(copyCases)
    setDisplayCases(copyDisplayCases)
  }, [cases])

  const declineOffer = () => {
    removeOfferFromLeftovers(offer);
    setRound(round + 1)
  }

  const keep = useCallback(async () => {
    const lastRemaining = gameCases[0]
    setRemovedCases(removedCases => [...removedCases, lastRemaining])
    cleanUpCaseDisplay(lastRemaining)
    setRound(round + 1)
  }, [gameCases, round, cases])

  const swap = useCallback(async () => {
    const lastRemaining = gameCases[0]
    const ogSelected = caseSelected
    setRemovedCases(removedCases => [...removedCases, ogSelected])
    setCaseSelected(lastRemaining)
    cleanUpCaseDisplay(ogSelected)
    setRound(round + 1)
  }, [gameCases, round, cases])

  const acceptOffer = () => {
    const accepted = offer
    setRemovedCases(cases)
    setCaseSelected(accepted)
    cleanAllCases()
    setRound(5)
  }
  
  const swapPosition = () => {
    setPool([])
    setType("WR")
    console.log("TYPE", type);
    setLimit(95)
    resetGame(false, "WR")
    setFinished(true)
  }

  const submitLineup = async () => {
    const docRef = doc(db, "leagues", leagueId, "seasons", season, "weeks", week, "entries", currentUid)
    await setDoc(docRef, {
      name: currentName,
      lineUp: lineUp
    })
    if(onComplete) {
      onComplete()
    } else {
      navigate(-1)
    }
  }


  useEffect(() => {
    if(type === "WR") {
      setLimit(95)
    }
    if(type === "RB") {
      setLimit(65)
      console.log("position group is ", type)
    }
  }, [type])
  


  useEffect(() => {
    if(limit) {
      getPlayers(week, type, season, limit, setPool);
    }
  }, [limit])

  useEffect(() => {
    if(pool.length > 0 && !cases) {
      console.log("pool when cases try to build", pool)
      buildCases()

    }
  }, [cases, pool])

  useEffect(() => {
    if(cases && leftovers === null) {
      buildLeftovers()
    }
  }, [cases, leftovers])

  useEffect(() => {
    if(cases && !displayCases) {
      buildDisplayCases()
    }
  }, [cases, displayCases])

  useEffect(() => {
    if(round === 1) {
      elimCases(3)
      console.log("eliminating first 3 fired. AND STOP TRYING TO CHEAT!")
    }
    if(round === 2) {
      elimCases(2)
      //console.log("eliminating second 2 fired")
    }
    if(round === 3) {
      elimCases(2)
      //console.log("eliminating next 2 fired")
    }
    if(round === 4) {
      elimCases(1)
      //console.log("eliminating last fired")
    }

    if(round === 5) {
      setLineUp(prev => ({ ...prev, [type]: caseSelected }))
      setMidway(true)
    }
  }, [round, caseSelected, type])

  useEffect(() => {
    if(reset) {
      setLeftovers(null)
      setCases(null)
      setCaseSelected(null)
      setGameCases(null)
      setRound(0)
      setThinking(false)
      setRemovedCases(null)
      setOffer(null)
      setDisplayCases(null)
      setReset(false) 
      
    }
  }, [reset])


  const render = () => {
    if(cases && caseSelected) {
      return(
        <>
        { cases.map((box,index) => ( box.opened === true ? 
          <div className="box opened" key={index}>
            {box.number}<br />
            {box.name}({box.points})
          </div>
          :
          <div className="box" key={index}>
            <span className="num">{box.number}</span>
          </div>
        ))}
        </>
      )
    } else if(cases) {
      return(
        <>
        { cases.map((box,index) => 
          <div className="box" key={index} onClick={() => selectCase(cases[index])}>
            <span className="num">{box.number}</span>
          </div>
        )}
        </>
      )
    }
  }

  const renderCaseDisplay = () => {
    if (displayCases) {
      return (
        <div className="display-cases">
          Players in cases: 
          {displayCases.map((item, index) => (
            item.opened? 
            <div className="list-player eliminated">{item.name} <span className="status">{item.team} {item.status}</span><br />
            <span className="proj">Proj: {item.points} Opp: {item.opponent}</span></div> 
            :
            <div className="list-player">{item.name} <span className="status">{item.team} {item.status}</span><br />
            <span className="proj">Proj: {item.points} Opp: {item.opponent}</span></div> 
          )
          )}
        </div>
      )
    }
  }


  
    
    
  const renderInfo = () => {
    if(!caseSelected) {
      return (
        <>
          <div>To begin select a case.</div>
          {renderCaseDisplay()}
        </>
      )
    }
      if(caseSelected) {
      return (
        <>
          <div className="case-selected-text">You have selected case #{caseSelected.number}</div>
          {thinking? <div>Eliminating Cases...</div> : <div></div>}

          {!thinking && displayCases?     
            <>{renderCaseDisplay()}</> : null
          }
        </>
        )
      }
  
  }

  const renderActions = () => {
    if(offer && round <= 3) {
      return (
        <div className="action-box">
          <div className="offer-box">The Banker offers you: 
            <div className="list-player">{offer.name} <span className="status">{offer.team} {offer.status}</span><br />
            <span className="proj">Proj: {offer.points} Opp: {offer.opponent}</span></div> 
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={acceptOffer}>Accept</button> 
            <button className="btn" onClick={declineOffer}>Decline</button>
            <button className="btn" onClick={resetGameHandler} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
          </div>
        </div>
      )
    } else if (offer && round === 4){
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You have rejected all offers and there is one more case remaining: {gameCases[0].number}.</p>
            <p>Would you like to keep your original case or swap with the last remaining?</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={keep}>Keep</button>
            <button className="btn" onClick={swap}>Swap</button>
            <button className="btn" onClick={resetGameHandler} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
          </div>
        </div>
      )
    } else if (offer && round === 5) {
      return (
        <div className="action-box">
          <div className="offer-box">
            {caseSelected.number? <p>Your Final case is case#{caseSelected.number}</p> : <p>You accepted the Banker's offer.</p> }
            <p>Congratulations!! Your player is {caseSelected.name}. His projected points are {caseSelected.points}</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={resetGameHandler} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
            {midway ? (finished ? <button className="btn" onClick={submitLineup}>Submit Lineup</button> : <button className="btn" onClick={swapPosition}>Switch Position Group</button>) : null}
          </div>
        </div>
      )
    } else {
      return (
        <div className="action-buttons">
            <button className="btn" onClick={resetGameHandler} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
            {midway ? (finished ? <button className="btn" onClick={submitLineup}>Submit Lineup</button> : <button className="btn" onClick={swapPosition}>Switch Position Group</button>) : null}
          </div>
      )
    }
  }
    
  

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
  )
}

export default Game
