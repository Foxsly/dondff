import React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { SeasonHighlights } from '../../../types';
import { SeasonHighlightsView } from '../SeasonHighlights';

const names: Record<string, string> = { u1: 'Alice', u2: 'Bob' };

const renderView = (highlights: SeasonHighlights) =>
  render(
    <SeasonHighlightsView
      highlights={highlights}
      nameFor={(userId) => names[userId]}
      positionLabel={(position) => position}
      eventTitle={(name) => `Week ${name}`}
      currentUserId="u2"
    />,
  );

const scored: SeasonHighlights = {
  seasonYear: 2025,
  finishedEventGroups: 2,
  topLineup: {
    teamId: 't1',
    userId: 'u1',
    eventGroupId: 'g2',
    eventGroupName: '2',
    totalPoints: 38.5,
    players: [
      { position: 'RB', playerId: 'p1', playerName: 'Bijan Robinson', actualPoints: 8 },
      { position: 'WR', playerId: 'p2', playerName: "Ja'Marr Chase", actualPoints: 30.5 },
    ],
  },
  topByPosition: [
    {
      position: 'RB',
      playerId: 'p3',
      playerName: 'Saquon Barkley',
      userId: 'u2',
      eventGroupId: 'g1',
      eventGroupName: '1',
      actualPoints: 25,
    },
  ],
  userStats: [
    { userId: 'u1', weeksPlayed: 3, wins: 2, totalPoints: 68.5, averagePoints: 34.25, bestScore: 38.5 },
    { userId: 'u2', weeksPlayed: 0, wins: 0, totalPoints: 0, averagePoints: null, bestScore: null },
  ],
};

describe('SeasonHighlightsView', () => {
  it('shows the top lineup and the best score per position with who and when', () => {
    renderView(scored);

    expect(screen.getByText('Top lineup')).toBeInTheDocument();
    expect(screen.getByText('38.50', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByText('Alice · Week 2')).toBeInTheDocument();
    expect(screen.getByText('Best RB')).toBeInTheDocument();
    expect(screen.getByText('Saquon Barkley')).toBeInTheDocument();
    expect(screen.getByText('Bob · Week 1')).toBeInTheDocument();
  });

  it('lists each player record, with a dash rather than zero when nothing is scored', () => {
    renderView(scored);

    const bobRow = screen.getByText('Bob').closest('tr')!;
    expect(within(bobRow).getByText('You')).toBeInTheDocument();
    expect(within(bobRow).getAllByText('—')).toHaveLength(2);

    const aliceRow = screen.getByText('Alice', { selector: 'td span' }).closest('tr')!;
    expect(within(aliceRow).getByText('34.25')).toBeInTheDocument();
    expect(within(aliceRow).getByText('68.50')).toBeInTheDocument();
  });

  it('still shows position bests when no full lineup has been scored', () => {
    renderView({ ...scored, topLineup: null });

    expect(screen.queryByText('Top lineup')).not.toBeInTheDocument();
    expect(screen.getByText('Best RB')).toBeInTheDocument();
    expect(screen.queryByText(/appear once a week is final/)).not.toBeInTheDocument();
  });

  it('explains when no week is final yet', () => {
    renderView({ ...scored, finishedEventGroups: 0, topLineup: null, topByPosition: [] });

    expect(screen.getByText(/appear once a week is final/)).toBeInTheDocument();
    expect(screen.queryByText('Top lineup')).not.toBeInTheDocument();
    expect(screen.getByText('Played')).toBeInTheDocument();
  });
});
