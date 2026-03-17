import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Accordion from "./accordion";
import Breadcrumbs from "./breadcrumbs";
import { getCurrentUser } from "../api/auth";
import { getLeagueTeams } from "../api/leagues";
import { useLeague } from "../contexts/LeagueContext";
import LoadingSpinner from "./ui/LoadingSpinner";
import ErrorDisplay from "./ui/ErrorDisplay";
import type { WeekOption } from "../sports/types";

interface GolfEvent {
  id: string;
  name: string;
}

const Weeks: React.FC = () => {
  const { leagueId, season } = useParams<{ leagueId: string; season: string }>();
  const navigate = useNavigate();
  const { league, sportConfig, loading: leagueLoading, error: leagueError } = useLeague();

  const [weeks, setWeeks] = useState<string[]>([]);
  const [weekLabels, setWeekLabels] = useState<Record<string, string>>({});
  const [currentWeek, setCurrentWeek] = useState<number | null>(null);
  const [availableEvents, setAvailableEvents] = useState<WeekOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sportConfig) return;

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

        const teams = await getLeagueTeams(leagueId!);

        if (cancelled) return;

        const weekSet = new Set<string>();

        if (Array.isArray(teams)) {
          const leagueTeams = teams.filter((team: any) => {
            const matchesLeague = team.leagueId && String(team.leagueId) === String(leagueId);
            const matchesSeason = !season || (team.seasonYear && String(team.seasonYear) === String(season));
            return matchesLeague && matchesSeason;
          });

          leagueTeams.forEach((team: any) => {
            if (team.week != null) weekSet.add(String(team.week));
          });
        }

        // Fetch current week from sport config
        const week = await sportConfig.fetchCurrentWeek();
        if (week != null) {
          if (!cancelled) setCurrentWeek(week);
          weekSet.add(String(week));
        }

        // Fetch available events (golf tournaments, etc.)
        const events = await sportConfig.fetchAvailableWeeks(season!);
        if (!cancelled) setAvailableEvents(events);

        const derivedWeeks = Array.from(weekSet);
        derivedWeeks.sort((a, b) => Number(a) - Number(b));
        if (!cancelled) setWeeks(derivedWeeks);
      } catch (err: any) {
        console.error("Failed to load weeks", err);
        if (!cancelled) setError(err?.message ?? "Failed to load weeks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId && season && sportConfig) {
      load();
    } else if (!leagueLoading) {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [leagueId, season, navigate, sportConfig, leagueLoading]);

  const handleCreateEventWeek = (event: WeekOption) => {
    const existingWeeks = weeks.map(Number);
    const nextWeek = existingWeeks.length > 0 ? Math.max(...existingWeeks) + 1 : 1;
    const weekStr = String(nextWeek);

    setWeeks((prev) => [...prev, weekStr].sort((a, b) => Number(a) - Number(b)));
    setWeekLabels((prev) => ({ ...prev, [weekStr]: event.label }));
    setAvailableEvents((prev) => prev.filter((e) => e.value !== event.value));
  };

  const breadcrumbs = [
    { label: "Dashboard", to: "/dashboard" },
    { label: league?.name || "League", to: `/league/${leagueId}` },
    { label: `Season ${season}` },
  ];

  const isLoading = loading || leagueLoading;
  const displayError = error || leagueError;

  if (isLoading) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={breadcrumbs} />
        <LoadingSpinner message="Loading weeks..." />
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={breadcrumbs} />
        <ErrorDisplay message={displayError} />
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs items={breadcrumbs} />
      <div className="space-y-4 max-w-[90%] mx-auto">
        {weeks.map((w) => (
          <Accordion
            key={w}
            weekDoc={{ week: w, label: weekLabels[w] }}
            leagueId={leagueId!}
            season={season!}
            actualWeek={currentWeek}
          />
        ))}
      </div>
      {availableEvents.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Available {sportConfig?.weekLabel}s
          </h3>
          {availableEvents.map((event) => (
            <button
              key={event.value}
              onClick={() => handleCreateEventWeek(event)}
              className="w-full text-left px-4 py-3 rounded bg-[#2a3447] hover:bg-[#344054] border border-[#3a465b] transition-colors"
            >
              <span className="text-white font-medium">{event.label}</span>
              <span className="text-gray-400 text-sm ml-2">— Create {sportConfig?.weekLabel?.toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
      {sportConfig?.key === 'NFL' && (
        <div>Current NFL Week: {currentWeek ?? "Unknown"}</div>
      )}
    </div>
  );
};

export default Weeks;
