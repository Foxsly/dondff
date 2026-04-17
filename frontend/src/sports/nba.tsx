import React from 'react';
import type { SportConfig, EventOption } from './types';
import type { GamePlayer, GameOffer } from '../types';
import { getEventGroupsBySportLeagueWithDates } from '../api/events';

export const nbaConfig: SportConfig = {
  key: 'NBA',
  displayName: 'NBA',
  eventLabel: 'Event',

  fetchCurrentSeason: async () => {
    return String(new Date().getFullYear());
  },

  fetchCurrentEventGroup: async () => {

    return null;
  },

  fetchAvailableEventGroups: async (season) => {
    try {
      const eventGroups = await getEventGroupsBySportLeagueWithDates('NBA');
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
      <span className="status">{player.matchup?.team} {player.injuryStatus}</span><br />
      <span className="proj">Proj: {player.projectedPoints} Opp: {player.matchup?.opponent}</span>
    </>
  ),

  renderOfferDetails: (offer: GameOffer) => (
    <>
      <span className="status"> {offer.matchup?.team} {offer.injuryStatus}</span><br />
      <span className="proj">Proj: {offer.projectedPoints} Opp: {offer.matchup?.opponent}</span>
    </>
  ),

  getPositionDisplayName: (position: string) => {
    return position;
  },

  supportsQuickPlay: false,
};
