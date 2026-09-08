import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { getLeagueTeams } from '../api/leagues';
import { useLeague } from '../contexts/LeagueContext';
import { ChevronRightIcon, Skeleton } from './ui';

interface SeasonsProps {
  leagueId: string;
}

const Seasons: React.FC<SeasonsProps> = ({ leagueId }) => {
  const navigate = useNavigate();
  const { sportConfig } = useLeague();

  const [seasons, setSeasons] = useState<string[]>([]);
  const [currentSeason, setCurrentSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError('');
        setLoading(true);

        const current = await getCurrentUser();
        const userId = current?.id || current?.userId;
        if (!current || !userId) {
          if (!cancelled) navigate('/');
          return;
        }

        const teams = await getLeagueTeams(leagueId);
        if (cancelled) return;

        const seasonSet = new Set<string>();

        if (Array.isArray(teams)) {
          teams
            .filter((team: any) => team.leagueId === leagueId)
            .forEach((team: any) => seasonSet.add(String(team.seasonYear)));
        }

        if (sportConfig) {
          const fetched = await sportConfig.fetchCurrentSeason();
          if (fetched != null) {
            seasonSet.add(fetched);
            if (!cancelled) setCurrentSeason(fetched);
          }
        }

        // Most recent first — the season someone wants is almost always the
        // newest, and the old ascending sort buried it at the bottom.
        const derived = Array.from(seasonSet).sort((a, b) => b.localeCompare(a));
        if (!cancelled) setSeasons(derived);
      } catch (err: any) {
        console.error('Failed to load seasons', err);
        if (!cancelled) setError(err?.message ?? 'Failed to load seasons');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [leagueId, navigate, sportConfig]);

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error}
      </p>
    );
  }

  if (seasons.length === 0) {
    return <p className="text-sm text-text-subtle">No seasons yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {seasons.map((season) => (
        <li key={season}>
          <Link
            to={`/league/${leagueId}/season/${season}`}
            className="flex items-center gap-3 rounded border border-border bg-surface-sunken px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <span className="flex-1 font-display text-base font-semibold text-text-strong">
              {season}
            </span>

            {season === currentSeason && (
              <span className="text-label uppercase text-brand">Current</span>
            )}

            <ChevronRightIcon className="h-4 w-4 text-text-subtle" />
          </Link>
        </li>
      ))}
    </ul>
  );
};

export default Seasons;
