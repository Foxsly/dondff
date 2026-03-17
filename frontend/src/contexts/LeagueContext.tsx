import React, { createContext, useContext, useEffect, useState } from 'react';
import type { League, LeaguePosition, SportLeague } from '../types';
import type { SportConfig } from '../sports/types';
import { getLeague, getLeaguePositions } from '../api/leagues';
import { getSportConfig } from '../sports/registry';

interface LeagueContextValue {
  league: League | null;
  positions: LeaguePosition[];
  sportConfig: SportConfig | null;
  loading: boolean;
  error: string;
}

const LeagueContext = createContext<LeagueContextValue>({
  league: null,
  positions: [],
  sportConfig: null,
  loading: true,
  error: '',
});

export const useLeague = () => useContext(LeagueContext);

interface LeagueProviderProps {
  leagueId: string;
  children: React.ReactNode;
}

export const LeagueProvider: React.FC<LeagueProviderProps> = ({ leagueId, children }) => {
  const [league, setLeague] = useState<League | null>(null);
  const [positions, setPositions] = useState<LeaguePosition[]>([]);
  const [sportConfig, setSportConfig] = useState<SportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError('');
        setLoading(true);

        const [leagueData, positionsData] = await Promise.all([
          getLeague(leagueId),
          getLeaguePositions(leagueId),
        ]);

        if (cancelled) return;

        setLeague(leagueData);
        setPositions(positionsData);

        if (leagueData.sportLeague) {
          setSportConfig(getSportConfig(leagueData.sportLeague));
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load league');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId) {
      load();
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [leagueId]);

  return (
    <LeagueContext.Provider value={{ league, positions, sportConfig, loading, error }}>
      {children}
    </LeagueContext.Provider>
  );
};
