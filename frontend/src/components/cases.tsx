import React, { useEffect, useState, useCallback } from 'react';
import { generateCases } from './util';
import type { PoolPlayer, GameCase } from '../types';

interface DisplayGameProps {
  pool: PoolPlayer[];
}

const DisplayGame: React.FC<DisplayGameProps> = ({ pool }) => {
  const [cases, setCases] = useState<GameCase[] | null>(null);
  const [caseSelected, setCaseSelected] = useState<GameCase | null>(null);
  const [gameCases, setGameCases] = useState<GameCase[] | null>(null);
  const [round, setRound] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [removedCases, setRemovedCases] = useState<GameCase[] | null>(null);
  const [offer, setOffer] = useState<PoolPlayer | null>(null);
  const [reset, setReset] = useState(false);
  const [leftovers, setLeftovers] = useState<PoolPlayer[] | null>(null);
  const [displayCases, setDisplayCases] = useState<GameCase[] | null>(null);

  const buildCases = useCallback(async () => {
    setCases(generateCases(pool, 10));
  }, []);

  const buildDisplayCases = () => {
    const copy = [...cases!];
    function shuffle(array: GameCase[]) {
      let currentIndex = array.length;
      while (currentIndex !== 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    }
    shuffle(copy);
    setDisplayCases(copy);
  };

  const buildLeftovers = async () => {
    const genLeftovers = (arr: GameCase[]) => {
      let copyPool = [...pool];
      const copyCases = arr;
      for (const item of copyCases) {
        copyPool = copyPool.filter((player) => player.name !== item.name);
      }
      return copyPool;
    };
    const realLeftovers = await genLeftovers(cases!);
    setLeftovers(realLeftovers);
  };

  const removeOfferFromLeftovers = (offer: PoolPlayer) => {
    const offerToRemoveIndex = leftovers!.findIndex((player) => player.playerId === offer.playerId);
    if (offerToRemoveIndex !== -1) {
      leftovers!.splice(offerToRemoveIndex, 1);
    }
  };

  const resetGame = () => {
    setReset(true);
  };

  const removeCases = (arr: GameCase[], n: number): GameCase[] => {
    const result: GameCase[] = new Array(n);
    let len = arr.length;
    const taken: number[] = new Array(len);
    if (n > len) throw new RangeError("getRandom: more elements taken than available");
    let i = n;
    while (i--) {
      const x = Math.floor(Math.random() * len);
      result[i] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
  };

  const selectCase = (box: GameCase) => {
    setCaseSelected(box);
    const copy = [...cases!];
    const index = copy.indexOf(box);
    copy.splice(index, 1);
    setGameCases(copy);
    setRound(1);
  };

  const elimCases = useCallback(async (num: number) => {
    setThinking(true);
    const latestCases = gameCases!;
    const removed = removeCases(latestCases, num);
    setThinking(false);
    if (removedCases) {
      for (const item of removed) {
        setRemovedCases((prev) => [...prev!, item]);
      }
    } else {
      setRemovedCases(removed);
    }

    let copyOrigCases = cases!;
    let copyDisplayCases = displayCases!;

    for (let i = 0; i < removed.length; i++) {
      const copy = gameCases!;
      const index = copy.indexOf(removed[i]);
      copy.splice(index, 1);
      await setGameCases(copy);

      copyOrigCases = copyOrigCases.map((box) =>
        box.name === removed[i].name ? { ...box, opened: true } : box
      );
      copyDisplayCases = copyDisplayCases.map((box) =>
        box.name === removed[i].name ? { ...box, opened: true } : box
      );
    }

    setCases(copyOrigCases);
    setDisplayCases(copyDisplayCases);

    if (round <= 3) {
      buildOffer(gameCases!, caseSelected!);
    }
  }, [gameCases, removedCases, round, cases, displayCases, caseSelected]);

  const buildOffer = async (arr: GameCase[], toAdd: GameCase) => {
    const latestCases = [...arr, toAdd];
    const len = latestCases.length;
    let offerValue = latestCases.reduce((prev, curr) => prev + Math.pow(curr.points, 2), 0);
    offerValue = Math.sqrt(offerValue / len);
    offerValue = Math.round(offerValue * 100) / 100;
    console.log(offerValue);

    const getClosestPoints = (data: PoolPlayer[], target: number) =>
      data.reduce((acc, obj) =>
        Math.abs(target - obj.points) < Math.abs(target - acc.points) ? obj : acc
      );
    const playerOffer = getClosestPoints(leftovers!, offerValue);
    console.log("the player to be offered is: ", playerOffer);
    setOffer(playerOffer);
  };

  const cleanUpCaseDisplay = useCallback(async (lastRemaining: GameCase) => {
    const copyCases = cases!.map((box) =>
      box.name === lastRemaining.name ? { ...box, opened: true } : box
    );
    const copyDisplayCases = displayCases!.map((box) =>
      box.name === lastRemaining.name ? { ...box, opened: true } : box
    );
    setCases(copyCases);
    setDisplayCases(copyDisplayCases);
  }, [cases, displayCases]);

  const cleanAllCases = useCallback(async () => {
    setCases(cases!.map((box) => ({ ...box, opened: true })));
    setDisplayCases(displayCases!.map((box) => ({ ...box, opened: true })));
  }, [cases]);

  const declineOffer = () => {
    removeOfferFromLeftovers(offer!);
    setRound(round + 1);
  };

  const keep = useCallback(async () => {
    const lastRemaining = gameCases![0];
    setRemovedCases((prev) => [...(prev ?? []), lastRemaining]);
    cleanUpCaseDisplay(lastRemaining);
    setRound(round + 1);
  }, [gameCases, round, cases]);

  const swap = useCallback(async () => {
    const lastRemaining = gameCases![0];
    const ogSelected = caseSelected!;
    setRemovedCases((prev) => [...(prev ?? []), ogSelected]);
    setCaseSelected(lastRemaining);
    cleanUpCaseDisplay(ogSelected);
    setRound(round + 1);
  }, [gameCases, round, cases]);

  const acceptOffer = () => {
    const accepted = offer!;
    setRemovedCases(cases);
    setCaseSelected({ ...accepted, number: 0, opened: true });
    cleanAllCases();
    setRound(5);
  };

  useEffect(() => {
    if (!cases) buildCases();
  }, [cases]);

  useEffect(() => {
    if (cases && leftovers === null) buildLeftovers();
  }, [cases, leftovers]);

  useEffect(() => {
    if (cases && !displayCases) buildDisplayCases();
  }, [cases, displayCases]);

  useEffect(() => {
    if (round === 1) elimCases(3);
    if (round === 2) elimCases(2);
    if (round === 3) elimCases(2);
    if (round === 4) elimCases(1);
  }, [round]);

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
          {cases.map((box, index) =>
            box.opened === true ? (
              <div className="box opened" key={index}>
                {box.number}<br />
                {box.name}({box.points})
              </div>
            ) : (
              <div className="box" key={index}>
                <span className="num">{box.number}</span>
              </div>
            )
          )}
        </>
      );
    } else if (cases) {
      return (
        <>
          {cases.map((box, index) =>
            <div className="box" key={index} onClick={() => selectCase(cases[index])}>
              <span className="num">{box.number}</span>
            </div>
          )}
        </>
      );
    }
  };

  const renderCaseDisplay = () => {
    if (displayCases) {
      return (
        <div className="display-cases">
          Players in cases:
          {displayCases.map((item, index) =>
            item.opened ? (
              <div className="list-player eliminated" key={index}>
                {item.name} <span className="status">{item.team} {item.status}</span><br />
                <span className="proj">Proj: {item.points} Opp: {item.opponent}</span>
              </div>
            ) : (
              <div className="list-player" key={index}>
                {item.name} <span className="status">{item.team} {item.status}</span><br />
                <span className="proj">Proj: {item.points} Opp: {item.opponent}</span>
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
          {renderCaseDisplay()}
        </>
      );
    }
    if (caseSelected) {
      return (
        <>
          <div className="case-selected-text">You have selected case #{caseSelected.number}</div>
          {thinking ? <div>Eliminating Cases...</div> : <div></div>}
          {!thinking && displayCases ? <>{renderCaseDisplay()}</> : null}
        </>
      );
    }
  };

  const renderActions = () => {
    if (offer && round <= 3) {
      return (
        <div className="action-box">
          <div className="offer-box">The Banker offers you:
            <div className="list-player">
              {offer.name} <span className="status">{offer.team} {offer.status}</span><br />
              <span className="proj">Proj: {offer.points} Opp: {offer.opponent}</span>
            </div>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={acceptOffer}>Accept</button>
            <button className="btn" onClick={declineOffer}>Decline</button>
            <button className="btn" onClick={resetGame}>Reset</button>
          </div>
        </div>
      );
    } else if (offer && round === 4) {
      return (
        <div className="action-box">
          <div className="offer-box">
            <p>You have rejected all offers and there is one more case remaining: {gameCases![0].number}.</p>
            <p>Would you like to keep your original case or swap with the last remaining?</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={keep}>Keep</button>
            <button className="btn" onClick={swap}>Swap</button>
            <button className="btn" onClick={resetGame}>Reset</button>
          </div>
        </div>
      );
    } else if (offer && round === 5) {
      return (
        <div className="action-box">
          <div className="offer-box">
            {caseSelected?.number
              ? <p>Your Final case is case#{caseSelected.number}</p>
              : <p>You accepted the Banker's offer.</p>
            }
            <p>Congratulations!! Your player is {caseSelected?.name}. Their projected points are {caseSelected?.points}</p>
          </div>
          <div className="action-buttons">
            <button className="btn" onClick={resetGame}>Reset</button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="action-buttons">
          <button className="btn" onClick={resetGame}>Reset</button>
        </div>
      );
    }
  };

  return (
    <>
      <div className="game">
        <div className="board">{render()}</div>
        <div className="side">
          {renderInfo()}
          {renderActions()}
        </div>
      </div>
    </>
  );
};

export default DisplayGame;
