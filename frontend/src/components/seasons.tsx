import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser } from "../api/auth";
import { getLeagueTeams } from "../api/leagues";
import { useLeague } from "../contexts/LeagueContext";
import LoadingSpinner from "./ui/LoadingSpinner";

interface SeasonsProps {
  leagueId: string;
}

const Seasons: React.FC<SeasonsProps> = ({ leagueId }) => {
  const navigate = useNavigate();
  const { sportConfig } = useLeague();

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
          if (!cancelled) navigate("/");
          return;
        }

        const teams = await getLeagueTeams(leagueId);

        if (cancelled) return;

        const seasonSet = new Set<string>();

        if (Array.isArray(teams)) {
          const leagueTeams = teams.filter((team: any) => team.leagueId === leagueId);
          leagueTeams.forEach((team: any) => seasonSet.add(String(team.seasonYear)));
        }

        if (sportConfig) {
          const currentSeason = await sportConfig.fetchCurrentSeason();
          if (currentSeason != null) seasonSet.add(currentSeason);
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

    return () => { cancelled = true; };
  }, [leagueId, navigate, sportConfig]);

  if (loading) {
    return (
      <div className="mx-auto p-4 space-y-4">
        <LoadingSpinner message="Loading seasons..." />
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
