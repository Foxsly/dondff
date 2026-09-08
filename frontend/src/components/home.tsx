import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { nflConfig } from '../sports/nfl';
import QuickPlayGame from './game/QuickPlayGame';
import { Alert, Button, Skeleton, buttonVariants } from './ui';
import hero from './images/DOND.jpg';

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

/** The week a quick-play board is dealt from, and how we arrived at it. */
interface QuickPlayWeek {
  eventGroupId: string;
  label: string;
  /** False once we have fallen back to the last published week — the off-season. */
  isCurrent: boolean;
}

const Home: React.FC = () => {
  const { user } = useContext(AuthContext);

  const [week, setWeek] = useState<QuickPlayWeek | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [weekError, setWeekError] = useState('');
  const [resolving, setResolving] = useState(true);
  const [position, setPosition] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const positions = nflConfig.quickPlayPositions ?? [];

  /**
   * Work out which week the demo board plays.
   *
   * In season that is simply the live NFL week, so a visitor never has to know
   * or care which one it is. The form this replaced asked them to choose from
   * twenty-one weeks, nearly all of which have no projections published and
   * produced a board that refused to build with no explanation of why.
   *
   * Out of season there is no live week, so fall back to the most recent one
   * that has an event group and label it as such rather than pretending.
   */
  useEffect(() => {
    let cancelled = false;
    setResolving(true);
    setWeekError('');

    (async () => {
      try {
        const [resolvedSeason, current] = await Promise.all([
          nflConfig.fetchCurrentSeason(),
          nflConfig.fetchCurrentEventGroup(),
        ]);
        if (cancelled) return;

        // The season used to be hard-coded to '2025', which silently went stale
        // at the turn of the year. Ask the sport config, then the calendar.
        const seasonYear = resolvedSeason ?? String(new Date().getFullYear());
        setSeason(seasonYear);

        if (current) {
          setWeek({
            eventGroupId: current.eventGroupId,
            label: `Week ${current.label}`,
            isCurrent: true,
          });
          return;
        }

        const groups = await nflConfig.fetchAvailableEventGroups(seasonYear);
        if (cancelled) return;

        const latest = groups
          .filter((group) => Number.isFinite(Number(group.label)))
          .sort((a, b) => Number(b.label) - Number(a.label))[0];

        if (!latest) {
          setWeekError('No NFL projections are published yet.');
          return;
        }

        setWeek({
          eventGroupId: latest.value,
          label: `Week ${latest.label}`,
          isCurrent: false,
        });
      } catch (err: any) {
        console.error('Failed to resolve the quick-play week', err);
        if (!cancelled) {
          setWeekError(err?.message ?? 'Could not work out which NFL week to play.');
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (position && week && season) {
    return (
      <QuickPlayGame
        sportConfig={nflConfig}
        position={position}
        season={season}
        eventGroupId={week.eventGroupId}
        weekLabel={week.label}
        onExit={() => setPosition(null)}
      />
    );
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

      {/* ── Quick play ─────────────────────────────────────── */}
      <section id="quick-play" className="border-t border-border">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Play a quick board</h2>
            <p className="mt-2 text-sm text-text-muted">
              No account needed. Pick a position group and we&apos;ll deal ten cases from this
              week&apos;s projections.
            </p>
          </div>

          <div className="mt-8">
            {resolving && <Skeleton className="h-28" />}

            {!resolving && weekError && (
              <Alert variant="warn" title="Quick play is unavailable">
                {weekError}
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                    Try again
                  </Button>
                </div>
              </Alert>
            )}

            {!resolving && !weekError && week && (
              <>
                <p className="text-center text-sm text-text-muted">
                  <span className="font-display font-semibold uppercase tracking-wide text-text-strong">
                    {week.label}
                  </span>
                  {!week.isCurrent && ' — the most recent week with projections'}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {positions.map((pos) => (
                    <Button key={pos} size="lg" fullWidth onClick={() => setPosition(pos)}>
                      Deal ten {nflConfig.getPositionDisplayName(pos)} cases
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
