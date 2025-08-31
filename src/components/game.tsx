import React, { useEffect, useState, useCallback} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth, db } from "../firebase-config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getPlayers, generateCases } from './util';

interface GameProps {
key?: any;
uid?: any;
onComplete?:((((((((((((((((((((((( () => void) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void)) | (() => void);
}

interface ResetState {
    RB: boolean;
    WR: boolean;
}

// Game component that can accept a specific uid or default to the current user
const Game = ({ uid, onComplete }: GameProps) => {


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
  const [resetUsed, setResetUsed] = useState<ResetState>({ RB: false, WR: false })

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
// @ts-expect-error -- TODO: Argument of type '{ number: number; name: any; points: any; opened: boolean; status: any; opponent: any; team: any; playerId: any; }[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setCases(generateCases(pool, 10))
  }, [pool])

  const buildDisplayCases = () => {
// @ts-expect-error -- TODO: Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
    let copy = [...cases]
// @ts-expect-error -- TODO: Parameter 'array' implicitly has an 'any' type.
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
// @ts-expect-error -- TODO: Argument of type 'any[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setDisplayCases(copy)
  }

  const buildLeftovers = async () => {
// @ts-expect-error -- TODO: Parameter 'arr' implicitly has an 'any' type.
    const genLeftovers = (arr) => {
      //console.log("genLeftovers fired, state is gonna set")
      let copyPool = [...pool]
      let copyCases = arr

      for(let item of copyCases) {
        copyPool = copyPool.filter((player) => {
// @ts-expect-error -- TODO: Property 'name' does not exist on type 'never'.
          if (player.name !== item.name) {
            return player
          }
        })
      }
      
      return copyPool
    }
    const realLeftovers = await genLeftovers(cases)
    //console.log("leftover cases generated: ", realLeftovers)
// @ts-expect-error -- TODO: Argument of type 'never[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setLeftovers(realLeftovers)
    
  }

// @ts-expect-error -- TODO: Parameter 'offer' implicitly has an 'any' type.
  const removeOfferFromLeftovers = (offer) => {
// @ts-expect-error -- TODO: 'leftovers' is possibly 'null'. Parameter 'player' implicitly has an 'any' type.
    let offerToRemoveIndex = leftovers.findIndex(player => player.playerId == offer.playerId);
    if (offerToRemoveIndex !== -1) {
// @ts-expect-error -- TODO: 'leftovers' is possibly 'null'.
      leftovers.splice(offerToRemoveIndex, 1);
    }
  }

  const resetGame = (consume:boolean = true) => {
// @ts-expect-error -- TODO: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ RB: boolean; WR: boolean; }'.
    if (consume && (caseSelected || resetUsed[type])) return
    if (consume) {
// @ts-expect-error -- TODO: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ RB: boolean; WR: boolean; }'.
      resetUsed[type] = true;
      setResetUsed(resetUsed);
    }
    setReset(true)
    setMidway(false)
    setLineUp(prev => ({ ...prev, [type]: { name: "awaiting game..." } }))
  }
  
// @ts-expect-error -- TODO: Parameter 'arr' implicitly has an 'any' type. Parameter 'n' implicitly has an 'any' type.
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
  
// @ts-expect-error -- TODO: Parameter 'box' implicitly has an 'any' type.
  const selectCase = (box) => {
    setCaseSelected(box)
// @ts-expect-error -- TODO: Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
    const copy = [...cases]
    const index = copy.indexOf(box)
    copy.splice(index, 1)
// @ts-expect-error -- TODO: Argument of type 'any[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setGameCases(copy)
    setRound(1)
  }

// @ts-expect-error -- TODO: Parameter 'num' implicitly has an 'any' type.
  const elimCases = useCallback(async (num) => {
    setThinking(true)
    const latestCases = gameCases
    const removed = removeCases(latestCases, num)
    setThinking(false)
    if (removedCases) {
      for (let item of removed) {
// @ts-expect-error -- TODO: Argument of type '(removedCases: null) => any[]' is not assignable to parameter of type 'SetStateAction<null>'. Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
        setRemovedCases(removedCases => [...removedCases, item])
      }
    } else {
// @ts-expect-error -- TODO: Argument of type 'any[]' is not assignable to parameter of type 'SetStateAction<null>'.
      setRemovedCases(removed)
    }
    let copyOrigCases = cases
    let copyDisplayCases = displayCases
    for(let i= 0; i<removed.length; i++) {
      let copy = gameCases
// @ts-expect-error -- TODO: 'copy' is possibly 'null'.
      let index = copy.indexOf(removed[i])
// @ts-expect-error -- TODO: 'copy' is possibly 'null'.
      copy.splice(index, 1)
      //console.log("found item at index: ", index)
      await setGameCases(copy)
      //console.log("intercepting...new game cases are: ", gameCases)

      
// @ts-expect-error -- TODO: 'copyOrigCases' is possibly 'null'. Parameter 'box' implicitly has an 'any' type.
      copyOrigCases = copyOrigCases.map((box) => {
        if(box.name === removed[i].name) {
          return {...box, opened: true}
        }
        return box
      })

// @ts-expect-error -- TODO: 'copyDisplayCases' is possibly 'null'. Parameter 'box' implicitly has an 'any' type.
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

// @ts-expect-error -- TODO: Parameter 'arr' implicitly has an 'any' type. Parameter 'toAdd' implicitly has an 'any' type.
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

// @ts-expect-error -- TODO: Parameter 'data' implicitly has an 'any' type. Parameter 'target' implicitly has an 'any' type.
    const getClosestPoints = (data, target) => 
// @ts-expect-error -- TODO: Parameter 'acc' implicitly has an 'any' type. Parameter 'obj' implicitly has an 'any' type.
      data.reduce((acc, obj) =>
        Math.abs(target - obj.points) < Math.abs(target - acc.points) ? obj : acc
    );
    const playerOffer = getClosestPoints(leftovers, offer)
    //console.log("your selected case is: ", caseSelected)
    console.log("the player to be offered is: ", playerOffer)

    setOffer(playerOffer)
  }

// @ts-expect-error -- TODO: Parameter 'lastRemaining' implicitly has an 'any' type.
  const cleanUpCaseDisplay = useCallback(async (lastRemaining) => {
    let copyCases = cases
    let copyDisplayCases = displayCases
    
// @ts-expect-error -- TODO: 'copyCases' is possibly 'null'. Parameter 'box' implicitly has an 'any' type.
      copyCases = copyCases.map((box) => {
        if(box.name === lastRemaining.name) {
            return {...box, opened: true}
        }
          return box
        })

// @ts-expect-error -- TODO: 'copyDisplayCases' is possibly 'null'. Parameter 'box' implicitly has an 'any' type.
      copyDisplayCases = copyDisplayCases.map((box) => {
        if(box.name === lastRemaining.name) {
          return {...box, opened: true}
        }
        return box
      })
    
    setCases(copyCases)
    setDisplayCases(copyDisplayCases)
  }, [cases, displayCases])

// @ts-expect-error -- TODO: Parameter 'lastRemaining' implicitly has an 'any' type.
  const cleanAllCases = useCallback(async (lastRemaining) => {
    let copyCases = cases
    let copyDisplayCases = displayCases
    
// @ts-expect-error -- TODO: 'copyCases' is possibly 'null'. Parameter 'box' implicitly has an 'any' type.
      copyCases = copyCases.map((box) => {
            return {...box, opened: true}
        })

// @ts-expect-error -- TODO: 'copyDisplayCases' is possibly 'null'. Parameter 'box' implicitly has an 'any' type.
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
// @ts-expect-error -- TODO: 'gameCases' is possibly 'null'.
    const lastRemaining = gameCases[0]
// @ts-expect-error -- TODO: Argument of type '(removedCases: null) => any[]' is not assignable to parameter of type 'SetStateAction<null>'. Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
    setRemovedCases(removedCases => [...removedCases, lastRemaining])
    cleanUpCaseDisplay(lastRemaining)
    setRound(round + 1)
  }, [gameCases, round, cases])

  const swap = useCallback(async () => {
// @ts-expect-error -- TODO: 'gameCases' is possibly 'null'.
    const lastRemaining = gameCases[0]
    const ogSelected = caseSelected
// @ts-expect-error -- TODO: Argument of type '(removedCases: null) => any[]' is not assignable to parameter of type 'SetStateAction<null>'. Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
    setRemovedCases(removedCases => [...removedCases, ogSelected])
    setCaseSelected(lastRemaining)
    cleanUpCaseDisplay(ogSelected)
    setRound(round + 1)
  }, [gameCases, round, cases])

  const acceptOffer = () => {
    const accepted = offer
    setRemovedCases(cases)
    setCaseSelected(accepted)
// @ts-expect-error -- TODO: Expected 1 arguments, but got 0.
    cleanAllCases()
    setRound(5)
  }
  
  const swapPosition = () => {
    setPool([])
    setType("WR")
    setLimit(95)
    resetGame(false)
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
// @ts-expect-error -- TODO: Argument of type 'Dispatch<SetStateAction<never[]>>' is not assignable to parameter of type '{ (value: SetStateAction<never[]>): void; (value: SetStateAction<never[]>): void; (arg0: { name: string; points: any; status: any; opponent: any; team: any; playerId: any; }[]): void; }'.
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
// @ts-expect-error -- TODO: Property 'map' does not exist on type 'never'. Parameter 'box' implicitly has an 'any' type. Parameter 'index' implicitly has an 'any' type.
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
// @ts-expect-error -- TODO: Property 'map' does not exist on type 'never'. Parameter 'box' implicitly has an 'any' type. Parameter 'index' implicitly has an 'any' type.
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
// @ts-expect-error -- TODO: Property 'map' does not exist on type 'never'. Parameter 'item' implicitly has an 'any' type. Parameter 'index' implicitly has an 'any' type.
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
// @ts-expect-error -- TODO: Property 'number' does not exist on type 'never'.
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
// @ts-expect-error -- TODO: Property 'name' does not exist on type 'never'. Property 'team' does not exist on type 'never'. Property 'status' does not exist on type 'never'.
            <div className="list-player">{offer.name} <span className="status">{offer.team} {offer.status}</span><br />
// @ts-expect-error -- TODO: Property 'points' does not exist on type 'never'. Property 'opponent' does not exist on type 'never'.
            <span className="proj">Proj: {offer.points} Opp: {offer.opponent}</span></div> 
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={acceptOffer}>Accept</button> 
            <button className="btn" onClick={declineOffer}>Decline</button>
            <button className="btn" onClick={resetGame} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
          </div>
        </div>
      )
    } else if (offer && round === 4){
      return (
        <div className="action-box">
          <div className="offer-box">
// @ts-expect-error -- TODO: 'gameCases' is possibly 'null'.
            <p>You have rejected all offers and there is one more case remaining: {gameCases[0].number}.</p>
            <p>Would you like to keep your original case or swap with the last remaining?</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={keep}>Keep</button>
            <button className="btn" onClick={swap}>Swap</button>
            <button className="btn" onClick={resetGame} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
          </div>
        </div>
      )
    } else if (offer && round === 5) {
      return (
        <div className="action-box">
          <div className="offer-box">
// @ts-expect-error -- TODO: 'caseSelected' is possibly 'null'. 'caseSelected' is possibly 'null'.
            {caseSelected.number? <p>Your Final case is case#{caseSelected.number}</p> : <p>You accepted the Banker's offer.</p> }
// @ts-expect-error -- TODO: 'caseSelected' is possibly 'null'. 'caseSelected' is possibly 'null'.
            <p>Congratulations!! Your player is {caseSelected.name}. His projected points are {caseSelected.points}</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={resetGame} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
            {midway ? (finished ? <button className="btn" onClick={submitLineup}>Submit Lineup</button> : <button className="btn" onClick={swapPosition}>Switch Position Group</button>) : null}
          </div>
        </div>
      )
    } else {
      return (
        <div className="action-buttons">
            <button className="btn" onClick={resetGame} disabled={caseSelected !== null || resetUsed[type]}>Reset</button>
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
