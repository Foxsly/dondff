import React from 'react';
import type { SportConfig, EventOption } from './types';
import type { GamePlayer, GameOffer } from '../types';
import { getEventGroupsBySportLeagueWithDates, type EventGroup } from '../api/events';

const POSITION_NAMES: Record<string, string> = {
  G: 'Guard',
  F: 'Forward',
  C: 'Center',
};

const startTime = (eg: EventGroup) => (eg.startDate ? new Date(eg.startDate).getTime() : Infinity);

/**
 * NBA event groups are Sleeper weeks ("NBA 2026-27 Week 3"); the backend only
 * syncs the current and next week. The current one is the week in progress,
 * or — between weeks or before the season — the next week to start.
 */
export const pickCurrentNbaWeek = (groups: EventGroup[]): EventGroup | null =>
  groups.find((eg) => eg.status === 'PLAYING') ??
  groups.filter((eg) => eg.status === 'PENDING').sort((a, b) => startTime(a) - startTime(b))[0] ??
  null;

const fetchNbaWeeks = async (): Promise<EventGroup[]> => {
  try {
    return (await getEventGroupsBySportLeagueWithDates('NBA')) ?? [];
  } catch {
    return [];
  }
};

/**
 * Opponents arrive as "BOS, MIA, NYK" — one per game that week. When the
 * backend has no matchup cached it sends "NA", and the game count is unknown.
 */
const renderMatchup = (team?: string, opponents?: string) => {
  if (!opponents || opponents === 'NA') return <>{team}</>;
  const games = opponents.split(', ').length;
  return (
    <>
      {team} · {games} {games === 1 ? 'game' : 'games'} vs {opponents}
    </>
  );
};

export const nbaConfig: SportConfig = {
  key: 'NBA',
  displayName: 'NBA',
  eventLabel: 'Week',

  // The NBA season spans two calendar years, so the season comes from the
  // current week's group (2026 for 2026-27) rather than today's date.
  fetchCurrentSeason: async () => {
    const groups = await fetchNbaWeeks();
    const current = pickCurrentNbaWeek(groups);
    if (current) return String(current.seasonYear);
    if (groups.length === 0) return null;
    return String(Math.max(...groups.map((eg) => eg.seasonYear)));
  },

  fetchCurrentEventGroup: async () => {
    const current = pickCurrentNbaWeek(await fetchNbaWeeks());
    return current ? { eventGroupId: current.eventGroupId, label: current.name } : null;
  },

  fetchAvailableEventGroups: async (season) => {
    const groups = await fetchNbaWeeks();
    return groups
      .filter((eg) => String(eg.seasonYear) === String(season))
      .map((eg): EventOption => ({
        value: eg.eventGroupId,
        label: eg.name,
        startDate: eg.startDate,
        endDate: eg.endDate,
        status: eg.status,
      }));
  },

  sharedProjectionPool: false,
  supportsScoring: true,

  renderPlayerDetails: (player: GamePlayer) => (
    <>
      {renderMatchup(player.matchup?.team, player.matchup?.opponent)} {player.injuryStatus} · Best
      game proj {player.projectedPoints}
    </>
  ),

  renderOfferDetails: (offer: GameOffer) => (
    <>
      {renderMatchup(offer.matchup?.team, offer.matchup?.opponent)} {offer.injuryStatus} · Best game
      proj {offer.projectedPoints}
    </>
  ),

  getPositionDisplayName: (position: string) => POSITION_NAMES[position] ?? position,

  positionOrder: ['G', 'F', 'C'],

  supportsQuickPlay: false,
};
