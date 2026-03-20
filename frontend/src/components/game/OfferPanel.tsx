import React from 'react';
import type {SportConfig} from '../../sports/types';
import type {GameOffer} from '../../types';

interface OfferPanelProps {
  offer: GameOffer;
  sportConfig: SportConfig | null;
  onAccept: () => void;
  onDecline: () => void;
  onReset: () => void;
}

const OfferPanel: React.FC<OfferPanelProps> = ({
  offer, sportConfig, onAccept, onDecline,
}) => (
  <div className="action-box">
    <div className="offer-box">The Banker offers you:
      <div className="list-player">
        {offer.playerName}
        {sportConfig?.renderOfferDetails(offer)}
      </div>
    </div>
    <div className="action-buttons">
      <button className="btn" onClick={onAccept}>Accept</button>
      <button className="btn" onClick={onDecline}>Decline</button>
    </div>
  </div>
);

export default OfferPanel;
