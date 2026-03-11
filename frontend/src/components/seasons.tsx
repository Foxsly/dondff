import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../api/auth";
import type { SportLeague } from "../types";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

interface SeasonsProps {
  leagueId: string;
  sportLeague?: SportLeague;
}

const Seasons: React.FC<SeasonsProps> = ({ leagueId, sportLeague }) => {
  const navigate = useNavigate();

  const [seasons, setSeasons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setLoading(true);

        const current = await getCurrentUser();
        if (!current) {
          if (!cancelled) navigate("/");
          return;
        }

        const userId = current.id || current.userId;
        if (!userId) {
          console.warn("No user id found on current user", current);
          if (!cancelled) navigate("/");
          return;
        }

        const isGolf = sportLeague === 'GOLF';

        const teamsRes = await fetch(`${API_BASE}/teams`, { credentials: "include" });
        if (!teamsRes.ok) throw new Error(`Failed to load teams (status ${teamsRes.status})`);
        const teams = await teamsRes.json();

        if (cancelled) return;

        const seasonSet = new Set<string>();

        if (Array.isArray(teams)) {
          const leagueTeams = teams.filter((team: any) => {
            const teamLeagueId = team.leagueId || team.league_id || team.league;
            return teamLeagueId && String(teamLeagueId) === String(leagueId);
          });

          leagueTeams.forEach((team: any) => {
            const value =
              team.season ??
              team.year ??
              team.seasonYear ??
              team.season_id ??
              null;
            if (value != null) seasonSet.add(String(value));
          });
        }

        if (isGolf) {
          // For golf, use the current year as the season
          seasonSet.add(String(new Date().getFullYear()));
        } else {
          // For NFL, fetch from Sleeper
          try {
            const stateRes = await fetch(`${API_BASE}/sleeper/state`, { credentials: "include" });
            if (stateRes.ok) {
              const sleeperState = await stateRes.json();
              if (sleeperState) {
                const currentSeason =
                  sleeperState.season ??
                  sleeperState.year ??
                  sleeperState.seasonId ??
                  sleeperState.current_season ??
                  null;
                if (currentSeason != null) seasonSet.add(String(currentSeason));
              }
            }
          } catch (e) {
            console.warn("Failed to load Sleeper state", e);
          }
        }

        const derivedSeasons = Array.from(seasonSet);
        derivedSeasons.sort();
        setSeasons(derivedSeasons);
      } catch (err: any) {
        console.error("Failed to load seasons", err);
        if (!cancelled) setError(err?.message ?? "Failed to load seasons");
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
  }, [leagueId, navigate]);

  if (loading) {
    return (
      <div className="mx-auto p-4 space-y-4">
        <p>Loading seasons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 space-y-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {seasons.map((season) => (
          <Link
            key={season}
            to={`/league/${leagueId}/season/${season}`}
            className="px-3 py-1 rounded bg-[#3a465b] hover:bg-[#3ab4cc]"
          >
            {season}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Seasons;
