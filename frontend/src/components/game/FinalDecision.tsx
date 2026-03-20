import React from 'react';
import type { GameBox } from '../../types';

interface FinalDecisionProps {
  remainingCase: GameBox | undefined;
  onKeep: () => void;
  onSwap: () => void;
  onReset: () => void;
  resetDisabled: boolean;
}

const FinalDecision: React.FC<FinalDecisionProps> = ({
  remainingCase, onKeep, onSwap, onReset, resetDisabled,
}) => (
  <div className="action-box">
    <div className="offer-box">
      <p>You have rejected all offers and there is one more case remaining: #{remainingCase?.boxNumber}.</p>
      <p>Would you like to keep your original case or swap with the last remaining?</p>
    </div>
    <div className="action-buttons">
      <button className="btn" onClick={onKeep}>Keep</button>
      <button className="btn" onClick={onSwap}>Swap</button>
      <button className="btn" onClick={onReset} disabled={resetDisabled}>Reset</button>
    </div>
  </div>
);

export default FinalDecision;
