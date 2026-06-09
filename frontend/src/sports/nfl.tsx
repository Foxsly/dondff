import React from 'react';
import type { SportConfig, EventOption } from './types';
import type { GamePlayer, GameOffer } from '../types';
import { getSleeperState } from '../api/sleeper';
import { getEventGroupsBySportLeague } from '../api/events';

export const nflConfig: SportConfig = {
  key: 'NFL',
  displayName: 'NFL',
  eventLabel: 'Week',

  fetchCurrentSeason: async () => {
    try {
      const state = await getSleeperState();
      return state?.season != null ? String(state.season) : null;
    } catch {
      return null;
    }
  },

  fetchCurrentEventGroup: async () => {
    try {
      const state = await getSleeperState();
      if (state?.week == null) return null;
      const weekNumber = Number(state.week);
      const eventGroups = await getEventGroupsBySportLeague('NFL');
      const eventGroup = eventGroups.find(eg => eg.name === `NFL Week ${weekNumber}`);
      if (eventGroup) {
        return {
          eventGroupId: eventGroup.eventGroupId,
          label: String(weekNumber),
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  fetchAvailableEventGroups: async () => {
      // PREVIOUSLY - NFL weeks come from team data + Sleeper state; the component handles merging.
      // PREVIOUSLY - This returns an empty array — the component adds the current event group from fetchCurrentEventGroup.

      try {
      const eventGroups = await getEventGroupsBySportLeague('NFL');
      return eventGroups.map((eg): EventOption => ({
        value: eg.eventGroupId,
        label: eg.name.replace('NFL Week ', ''),
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

  getPositionDisplayName: (position: string) => position,

  positionOrder: ['RB', 'WR'],

  supportsQuickPlay: true,
  quickPlayPositions: ['WR', 'RB'],
  quickPlayWeekCount: 21,
};
