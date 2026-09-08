import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEventGroupsBySportLeague } from '../api/events';
import { AuthContext } from '../contexts/AuthContext';
import { nflConfig } from '../sports/nfl';
import type { PoolPlayer } from '../types';
import DisplayGame from './cases';
import {
  Alert,
  Button,
  Field,
  SegmentedControl,
  Select,
  buttonVariants,
} from './ui';
import { fetchPlayerPool } from './util';
import hero from './images/DOND.jpg';

/** Pool size per position for a quick-play board. */
const POOL_SIZES: Record<string, number> = { WR: 95, RB: 65 };

const STEPS = [
  {
    title: 'Pick a case',
    body: 'Ten mystery players, one board. Choose the case you think is holding the best projection.',
  },
  {
    title: 'Take the deal — or don\'t',
    body: 'Cases open one by one. The banker counters with a known player. Accept it, or keep opening.',
  },
  {
    title: 'Live with it',
    body: 'Whoever is left in your case is in your lineup. Highest total at the end of the week wins.',
  },
];

const Home: React.FC = () => {
  const { user } = useContext(AuthContext);

  const [week, setWeek] = useState('');
  const [position, setPosition] = useState('');
  const [pool, setPool] = useState<PoolPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const positions = nflConfig.quickPlayPositions ?? [];
  const weekCount = nflConfig.quickPlayWeekCount ?? 21;

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!week || !position) return;

    setError('');
    setLoading(true);

    try {
      // The season used to be hard-coded to '2025', which silently went stale
      // at the turn of the year. Ask the sport config instead.
      const season = (await nflConfig.fetchCurrentSeason()) ?? String(new Date().getFullYear());

      const eventGroups = await getEventGroupsBySportLeague('NFL');
      const eventGroup = eventGroups.find((group) => group.name === `NFL Week ${week}`);

      if (!eventGroup) {
        // Previously this failed silently — the button simply did nothing.
        setError(`No projections are available for NFL week ${week} yet.`);
        return;
      }

      const players = await fetchPlayerPool(
        eventGroup.eventGroupId,
        position,
        season,
        POOL_SIZES[position] ?? 65,
      );

      // The board deals ten cases, so anything less can't produce a game.
      if (players.length < 10) {
        setError(`Not enough ${position} projections published for week ${week} yet.`);
        return;
      }

      setPool(players);
    } catch (err: any) {
      console.error('Failed to build quick-play board', err);
      setError(err?.message ?? 'Something went wrong building the board.');
    } finally {
      setLoading(false);
    }
  };

  if (pool.length > 0) {
    return <DisplayGame pool={pool} />;
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <img
          src={hero}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-top opacity-30"
        />
        {/* Three layers, in order: a vertical fade so the section reads as part
            of the page rather than a pasted-in photo; a flat scrim to hold text
            contrast over the busiest part of the image; and a spotlight from
            top centre, which is what gives the section its stage depth. */}
        <div className="absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/85 to-bg" />
        <div className="absolute inset-0 bg-bg/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgb(var(--color-brand)/0.16),transparent_70%)]" />

        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Fantasy Football
          </p>

          <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-text-strong sm:text-6xl lg:text-7xl">
            Deal
            <span className="text-text-muted"> or </span>
            No Deal
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-text-muted">
            Draft your lineup the hard way. Open cases, weigh the banker's offer,
            and gamble on the players you can't see.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                  Go to your leagues
                </Link>
                <a href="#quick-play" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Play a quick board
                </a>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                  Create an account
                </Link>
                <a href="#quick-play" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                  Try it without signing up
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface-sunken">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative">
                <span
                  aria-hidden
                  className="font-display text-4xl font-bold leading-none text-brand/25"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-base font-semibold text-text-strong">{step.title}</h3>
                <p className="mt-1.5 text-sm text-text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Quick play ───────────────────────────────────────────────────── */}
      <section id="quick-play" className="border-t border-border">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Play a quick board</h2>
            <p className="mt-2 text-sm text-text-muted">
              No account needed. Pick a week and a position group to generate ten cases.
            </p>
          </div>

          <form onSubmit={handleStart} className="mt-8 space-y-5">
            <Field label="NFL week">
              {(field) => (
                <Select
                  {...field}
                  value={week}
                  onChange={(event) => setWeek(event.target.value)}
                  placeholder="Choose a week"
                >
                  {Array.from({ length: weekCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Week {i + 1}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text-muted">Player group</span>
              <SegmentedControl
                label="Player group"
                options={positions.map((pos) => ({ value: pos, label: pos }))}
                value={position}
                onChange={setPosition}
                fullWidth
              />
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!week || !position}
            >
              {loading ? 'Building board' : 'Build board'}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
};

export default Home;
