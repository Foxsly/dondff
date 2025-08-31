import React, { useEffect, useState, useCallback} from 'react'
import { generateCases } from './util'

interface DisplayGameProps {
pool: never[] | string | any[];
}

const DisplayGame = ({pool}: DisplayGameProps) => {

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

  
  
  const buildCases = useCallback(async () => {
// @ts-expect-error -- TODO: Argument of type '{ number: number; name: any; points: any; opened: boolean; status: any; opponent: any; team: any; playerId: any; }[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setCases(generateCases(pool, 10));
  }, [])

  const buildDisplayCases = () => {
// @ts-expect-error -- TODO: Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
    let copy = [...cases]
    function shuffle(array: string | any[]) {
      let currentIndex = array.length,  randomIndex;
    
      // While there remain elements to shuffle.
      while (currentIndex !== 0) {
    
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
    
        // And swap it with the current element.
// @ts-expect-error -- TODO: Index signature in type 'string | any[]' only permits reading. Index signature in type 'string | any[]' only permits reading.
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
          if (player.name !== item.name) {
            return player
          }
        })
      }
      
      return copyPool
    }
    const realLeftovers = await genLeftovers(cases)
    //console.log("leftover cases generated: ", realLeftovers)
// @ts-expect-error -- TODO: Argument of type 'any[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setLeftovers(realLeftovers)
    
  }

  const removeOfferFromLeftovers = (offer: { playerId: any; } | null) => {
// @ts-expect-error -- TODO: 'leftovers' is possibly 'null'. 'offer' is possibly 'null'.
    let offerToRemoveIndex = leftovers.findIndex((player: { playerId: any; }) => player.playerId == offer.playerId);
    if (offerToRemoveIndex !== -1) {
// @ts-expect-error -- TODO: 'leftovers' is possibly 'null'.
      leftovers.splice(offerToRemoveIndex, 1);
    }
  }

  const resetGame = () => {
    setReset(true)
  }
  
  const removeCases = (arr: string | any[] | null, n: number) => {
    var result = new Array(n),
// @ts-expect-error -- TODO: 'arr' is possibly 'null'.
        len = arr.length,
        taken = new Array(len);
    if (n > len)
        throw new RangeError("getRandom: more elements taken than available");
    while (n--) {
        var x = Math.floor(Math.random() * len);
// @ts-expect-error -- TODO: 'arr' is possibly 'null'.
        result[n] = arr[x in taken ? taken[x] : x];
        taken[x] = --len in taken ? taken[len] : len;
    }
    return result
  }
  
  const selectCase = (box: React.SetStateAction<null>) => {
    setCaseSelected(box)
// @ts-expect-error -- TODO: Type 'null' must have a '[Symbol.iterator]()' method that returns an iterator.
    const copy = [...cases]
    const index = copy.indexOf(box)
    copy.splice(index, 1)
// @ts-expect-error -- TODO: Argument of type 'any[]' is not assignable to parameter of type 'SetStateAction<null>'.
    setGameCases(copy)
    setRound(1)
  }

  const elimCases = useCallback(async (num: number) => {
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

      
// @ts-expect-error -- TODO: 'copyOrigCases' is possibly 'null'.
      copyOrigCases = copyOrigCases.map((box: { name: any; }) => {
        if(box.name === removed[i].name) {
          return {...box, opened: true}
        }
        return box
      })

// @ts-expect-error -- TODO: 'copyDisplayCases' is possibly 'null'.
      copyDisplayCases = copyDisplayCases.map((box: { name: any; }) => {
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

    const getClosestPoints = (data: any[] | null, target: number) => 
// @ts-expect-error -- TODO: 'data' is possibly 'null'.
      data.reduce((acc: { points: number; }, obj: { points: number; }) =>
        Math.abs(target - obj.points) < Math.abs(target - acc.points) ? obj : acc
    );
    const playerOffer = getClosestPoints(leftovers, offer)
    //console.log("your selected case is: ", caseSelected)
    console.log("the player to be offered is: ", playerOffer)

    setOffer(playerOffer)
  }

  const cleanUpCaseDisplay = useCallback(async (lastRemaining: { name: any; }) => {
    let copyCases = cases
    let copyDisplayCases = displayCases
    
// @ts-expect-error -- TODO: 'copyCases' is possibly 'null'.
      copyCases = copyCases.map((box: { name: any; }) => {
        if(box.name === lastRemaining.name) {
            return {...box, opened: true}
        }
          return box
        })

// @ts-expect-error -- TODO: 'copyDisplayCases' is possibly 'null'.
      copyDisplayCases = copyDisplayCases.map((box: { name: any; }) => {
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
// @ts-expect-error -- TODO: Argument of type 'null' is not assignable to parameter of type '{ name: any; }'.
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


  useEffect(() => {
    if(!cases) {
      buildCases()
    }
  }, [cases])

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
  }, [round])

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
// @ts-expect-error -- TODO: Property 'map' does not exist on type 'never'.
        {cases.map((box: { opened: boolean; number: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; name: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; points: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; },index: React.Key | null | undefined) => (
          box.opened === true ? 
          <div className="box opened" key={index}>
            {box.number}<br />
            {box.name}({box.points})
          </div>
          :
          <div className="box" key={index}>
            <span className="num">{box.number}</span>
          </div>
        )

        )}
        </>
      )
    } else if(cases) {
      return(
        <>
// @ts-expect-error -- TODO: Property 'map' does not exist on type 'never'.
        {cases.map((box: { number: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; },index: React.Key | null | undefined) => 
// @ts-expect-error -- TODO: Type 'bigint' cannot be used as an index type. Type 'null' cannot be used as an index type. Type 'undefined' cannot be used as an index type.
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
// @ts-expect-error -- TODO: Property 'map' does not exist on type 'never'.
          {displayCases.map((item: { opened: any; name: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; team: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; status: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; points: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; opponent: string | number | bigint | boolean | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown,string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, index: React.Key | null | undefined) => (
            item.opened? 
            <div className="list-player eliminated" key={index}>{item.name} <span className="status">{item.team} {item.status}</span><br />
            <span className="proj">Proj: {item.points} Opp: {item.opponent}</span></div> 
            :
            <div className="list-player" key={index}>{item.name} <span className="status">{item.team} {item.status}</span><br />
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
            <button className="btn" onClick={resetGame}>Reset</button>
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
            <button className="btn" onClick={resetGame}>Reset</button>
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
            <button className="btn" onClick={resetGame}>Reset</button>
          </div>
        </div>
      )
    } else {
      return (
        <div className="action-buttons">
            <button className="btn" onClick={resetGame}>Reset</button>
          </div>
      )
    }
  }
    
  

  return (
    <>
      <div className="game">
        <div className="board">
          {render()}
        </div>
        <div className="side">
          {renderInfo()}
          {renderActions()}
        </div>
      </div>
    </>
  )
}

export default DisplayGame