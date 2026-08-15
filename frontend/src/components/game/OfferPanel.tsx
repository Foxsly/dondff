import React from 'react';
import type { SportConfig } from '../../sports/types';
import type { GameOffer } from '../../types';
import { Button } from '../ui';

interface OfferPanelProps {
  offer: GameOffer;
  sportConfig: SportConfig | null;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * The banker's offer — the moment the whole game turns on.
 *
 * Given the loudest treatment on the screen: gold rule, condensed caps, the
 * offered player at display size. The old version was a dashed teal border
 * around body text, which gave the central decision less visual weight than
 * the surrounding chrome.
 */
const OfferPanel: React.FC<OfferPanelProps> = ({
  offer,
  sportConfig,
  busy,
  onAccept,
  onDecline,
}) => (
  <section
    aria-label="Banker's offer"
    className="overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-gold-bg/60 to-surface shadow-lg"
  >
    <div className="border-b border-gold/25 bg-gold/10 px-5 py-2.5 text-center">
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
        The banker offers
      </h2>
    </div>

    <div className="px-5 py-6 text-center">
      <p className="font-display text-2xl font-bold leading-tight text-text-strong sm:text-3xl">
        {offer.playerName}
      </p>

      <div className="mt-2 text-sm text-text-muted">{sportConfig?.renderOfferDetails(offer)}</div>
    </div>

    <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row">
      <Button size="lg" fullWidth loading={busy} onClick={onAccept}>
        Deal
      </Button>
      <Button size="lg" variant="outline" fullWidth disabled={busy} onClick={onDecline}>
        No deal
      </Button>
    </div>
  </section>
);

export default OfferPanel;
