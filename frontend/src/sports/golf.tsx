import React from 'react';
import type { SportConfig, EventOption } from './types';
import type { GamePlayer, GameOffer } from '../types';
import { getGolfEvents } from '../api/fanduel';

export const golfConfig: SportConfig = {
  key: 'GOLF',
  displayName: 'Golf',
  eventLabel: 'Event',

  fetchCurrentSeason: async () => {
    return String(new Date().getFullYear());
  },

  fetchCurrentEventGroup: async () => {
    // Golf doesn't have a fixed "current event group" — events are created ad-hoc
    return null;
  },

  fetchAvailableEventGroups: async () => {
    try {
      const events = await getGolfEvents();
      if (!Array.isArray(events)) return [];
      return events.map((e): EventOption => ({ value: e.id, label: e.name }));
    } catch {
      return [];
    }
  },

  sharedProjectionPool: true,
  supportsScoring: false,

  renderPlayerDetails: (player: GamePlayer) => (
    <span className="proj">Proj: {player.projectedPoints}</span>
  ),

  renderOfferDetails: (offer: GameOffer) => (
    <>
      <br />
      <span className="proj">Proj: {offer.projectedPoints}</span>
    </>
  ),

  getPositionDisplayName: (position: string) => {
    if (position.startsWith('GOLF_PLAYER')) {
      const num = position.replace('GOLF_PLAYER_', '');
      return `Golfer ${num}`;
    }
    return position;
  },

  supportsQuickPlay: false,
};
