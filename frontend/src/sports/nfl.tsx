import React from 'react';
import type { SportConfig } from './types';
import type { GamePlayer, GameOffer } from '../types';
import { getSleeperState } from '../api/sleeper';
import { getOrCreateEventGroup } from '../api/events';

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
      const eventGroup = await getOrCreateEventGroup(`NFL Week ${weekNumber}`);
      return {
        eventGroupId: eventGroup.eventGroupId,
        label: String(weekNumber),
      };
    } catch {
      return null;
    }
  },

  fetchAvailableEventGroups: async () => {
    // NFL weeks come from team data + Sleeper state; the component handles merging.
    // This returns an empty array — the component adds the current event group from fetchCurrentEventGroup.
    return [];
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

  supportsQuickPlay: true,
  quickPlayPositions: ['WR', 'RB'],
  quickPlayWeekCount: 21,
};
