import React from 'react';
import { render, screen } from '@testing-library/react';
import { LineupCard, type LineupSlot } from '..';

/**
 * The standings card was preserved from the pre-overhaul UI at the user's
 * request, so these lock in the behaviour that is easy to break while
 * refactoring its markup — particularly the difference between "no score yet"
 * and "a score of zero", which look identical if you get it wrong.
 */

const slots: LineupSlot[] = [
  { position: 'RB', positionLabel: 'RB', playerName: 'Bijan Robinson', projected: 17.4, actual: 22.1 },
  { position: 'WR', positionLabel: 'WR', playerName: "Ja'Marr Chase", projected: 15.2, actual: 18.6 },
];

describe('LineupCard', () => {
  it('shows every slot with its position and projection', () => {
    render(<LineupCard title="Josh" slots={slots} projectedTotal={32.6} />);

    expect(screen.getByText('Bijan Robinson')).toBeInTheDocument();
    expect(screen.getByText("Ja'Marr Chase")).toBeInTheDocument();
    expect(screen.getByText('17.40')).toBeInTheDocument();
    expect(screen.getByText('32.60')).toBeInTheDocument();
  });

  it('hides the Final column until results exist', () => {
    render(<LineupCard title="Josh" slots={slots} projectedTotal={32.6} />);

    expect(screen.queryByText('Final')).not.toBeInTheDocument();
    expect(screen.queryByText('22.10')).not.toBeInTheDocument();
  });

  it('shows finals once a score is in', () => {
    render(
      <LineupCard title="Josh" slots={slots} projectedTotal={32.6} showFinal finalScore={40.7} />,
    );

    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByText('22.10')).toBeInTheDocument();
    expect(screen.getByText('40.70')).toBeInTheDocument();
  });

  it('withholds the final total when showFinal is set but no score has landed', () => {
    // An event can be over while scores are still being calculated. Rendering
    // 0.00 there would read as a real last-place finish.
    render(
      <LineupCard title="Josh" slots={slots} projectedTotal={32.6} showFinal finalScore={null} />,
    );

    expect(screen.queryByText('Final Score')).not.toBeInTheDocument();
  });

  it('renders a placeholder for an undrafted slot rather than an empty row', () => {
    render(
      <LineupCard
        title="Josh"
        projectedTotal={17.4}
        slots={[slots[0], { position: 'WR', positionLabel: 'WR', playerName: null, projected: 0 }]}
      />,
    );

    expect(screen.getByText('---')).toBeInTheDocument();
  });

  it('leaves the projection blank when there is none, instead of showing 0.00', () => {
    // The in-game lineup carries no projections; a zero there would look like
    // a real score.
    render(
      <LineupCard
        variant="compact"
        title="In progress"
        projectedTotal={0}
        slots={[{ position: 'RB', positionLabel: 'RB', playerName: 'Bijan Robinson', projected: null }]}
      />,
    );

    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });

  it('drops the totals footer in the compact variant', () => {
    render(
      <LineupCard variant="compact" title="In progress" slots={slots} projectedTotal={32.6} />,
    );

    expect(screen.queryByText('Proj Total')).not.toBeInTheDocument();
  });

  it("marks the signed-in user's own card", () => {
    render(<LineupCard title="Josh" slots={slots} projectedTotal={32.6} isCurrentUser />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });
});
