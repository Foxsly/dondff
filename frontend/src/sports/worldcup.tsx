import React from 'react';
import type { SportConfig, EventOption } from './types';
import type { GamePlayer, GameOffer } from '../types';
import { getEventGroupsBySportLeagueWithDates } from '../api/events';

/**
 * TODO - figure out if we want the case display to have the price instead of 'pts'
 */

export const worldCupConfig: SportConfig = {
  key: 'WORLDCUP',
  displayName: 'World Cup',
  eventLabel: 'Round',

  fetchCurrentSeason: async () => {
    return String(new Date().getFullYear());
  },

  fetchCurrentEventGroup: async () => {
    return null;
  },

  fetchAvailableEventGroups: async (season) => {
    try {
      const eventGroups = await getEventGroupsBySportLeagueWithDates('WORLDCUP');
      return eventGroups.map((eg): EventOption => ({
        ...eg,
        value: eg.eventGroupId,
        label: eg.name,
      }));
    } catch {
      return [];
    }
  },

  sharedProjectionPool: false,
  supportsScoring: true,

  renderPlayerDetails: (player: GamePlayer) => (
    <>
      {player.matchup?.team ?? ''} vs {player.matchup?.opponent ?? ''} · $
      {(player.projectedPoints * 1000).toLocaleString()}
    </>
  ),

  renderOfferDetails: (offer: GameOffer) => (
    <>
      {offer.matchup?.team ?? ''} vs {offer.matchup?.opponent ?? ''} · $
      {(offer.projectedPoints * 1000).toLocaleString()}
    </>
  ),

  getPositionDisplayName: (position: string) => position,

  positionOrder: ['GK', 'DEF', 'MID', 'FWD'],

  supportsQuickPlay: false,
};
