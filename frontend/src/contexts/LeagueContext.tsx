import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {getLeague, getLeaguePositions} from '../api/leagues';
import {getSportConfig} from '../sports/registry';
import type {SportConfig} from '../sports/types';
import type {League, LeaguePosition} from '../types';

interface LeagueContextValue {
  league: League | null;
  positions: LeaguePosition[];
  sportConfig: SportConfig | null;
  loading: boolean;
  error: string;
  /**
   * Re-fetch the league and its positions. Needed after an admin edits the
   * league, so the name in the header, breadcrumb and tabs updates without a
   * full page reload.
   */
  refresh: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextValue>({
  league: null,
  positions: [],
  sportConfig: null,
  loading: true,
  error: '',
  refresh: async () => {},
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

  const load = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setError('');
      setLoading(true);

      const [leagueData, positionsData] = await Promise.all([
        getLeague(leagueId),
        getLeaguePositions(leagueId),
      ]);

      if (signal?.cancelled) return;

      setLeague(leagueData);

      if (leagueData.sportLeague) {
        const config = getSportConfig(leagueData.sportLeague);
        if (config.positionOrder) {
          positionsData.sort(
            (a, b) => config.positionOrder!.indexOf(a.position) - config.positionOrder!.indexOf(b.position)
          );
        }
        setSportConfig(config);
      }

      setPositions(positionsData);
    } catch (err: any) {
      if (!signal?.cancelled) setError(err?.message ?? 'Failed to load league');
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    const signal = { cancelled: false };

    if (leagueId) {
      load(signal);
    } else {
      setLoading(false);
    }

    return () => { signal.cancelled = true; };
  }, [leagueId, load]);

  const refresh = useCallback(() => load(), [load]);

  return (
    <LeagueContext.Provider value={{ league, positions, sportConfig, loading, error, refresh }}>
      {children}
    </LeagueContext.Provider>
  );
};
