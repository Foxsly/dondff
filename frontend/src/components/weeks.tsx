import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Accordion from "./accordion";
import Breadcrumbs from "./breadcrumbs";
import { getCurrentUser } from "../api/auth";
import type { SportLeague } from "../types";

interface GolfEvent {
  id: string;
  name: string;
}

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

const Weeks: React.FC = () => {
  const { leagueId, season } = useParams<{ leagueId: string; season: string }>();
  const navigate = useNavigate();

  const [weeks, setWeeks] = useState<string[]>([]);
  const [weekLabels, setWeekLabels] = useState<Record<string, string>>({});
  const [actualNFLWeek, setActualNFLWeek] = useState<number | null>(null);
  const [sportLeague, setSportLeague] = useState<SportLeague>('NFL');
  const [leagueName, setLeagueName] = useState("");
  const [golfEvents, setGolfEvents] = useState<GolfEvent[]>([]);
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

        const [leagueRes, teamsRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}`, { credentials: "include" }),
          fetch(`${API_BASE}/teams`, { credentials: "include" }),
        ]);

        if (!leagueRes.ok) throw new Error(`Failed to load league (status ${leagueRes.status})`);
        if (!teamsRes.ok) throw new Error(`Failed to load teams (status ${teamsRes.status})`);

        const leagueData = await leagueRes.json();
        const teams = await teamsRes.json();

        if (cancelled) return;

        const sport: SportLeague = leagueData.sportLeague;
        setSportLeague(sport);
        setLeagueName(leagueData?.name || "");

        const weekSet = new Set<string>();
        const labels: Record<string, string> = {};

        if (Array.isArray(teams)) {
          const leagueTeams = teams.filter((team: any) => {
            const teamLeagueId = team.leagueId;
            const teamSeason = team.seasonYear;
            const matchesLeague = teamLeagueId && String(teamLeagueId) === String(leagueId);
            const matchesSeason = !season || (teamSeason && String(teamSeason) === String(season));
            return matchesLeague && matchesSeason;
          });

          leagueTeams.forEach((team: any) => {
            const teamWeek = team.week;
            if (teamWeek != null) weekSet.add(String(teamWeek));
          });
        }

        if (sport === 'GOLF') {
          try {
            const eventRes = await fetch(`${API_BASE}/fanduel/GOLF/events`, { credentials: "include" });
            if (eventRes.ok) {
              const events: GolfEvent[] = await eventRes.json();
              if (Array.isArray(events) && events.length > 0) {
                setGolfEvents(events);
              }
            }
          } catch (e) {
            console.warn("Failed to load golf events", e);
          }
        } else {
          // For NFL, fetch from Sleeper
          try {
            const stateRes = await fetch(`${API_BASE}/sleeper/state`, { credentials: "include" });
            if (stateRes.ok) {
              const sleeperState = await stateRes.json();
              if (sleeperState) {
                const currentWeek = sleeperState.week;
                if (currentWeek != null) {
                  setActualNFLWeek(Number(currentWeek));
                  weekSet.add(String(currentWeek));
                }
              }
            }
          } catch (e) {
            console.warn("Failed to load Sleeper state", e);
          }
        }

        setWeekLabels(labels);
        const derivedWeeks = Array.from(weekSet);
        derivedWeeks.sort((a, b) => Number(a) - Number(b));
        setWeeks(derivedWeeks);
      } catch (err: any) {
        console.error("Failed to load weeks", err);
        if (!cancelled) setError(err?.message ?? "Failed to load weeks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId && season) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [leagueId, season, navigate]);

  const handleCreateGolfWeek = (event: GolfEvent) => {
    const existingWeeks = weeks.map(Number);
    const nextWeek = existingWeeks.length > 0 ? Math.max(...existingWeeks) + 1 : 1;
    const weekStr = String(nextWeek);

    setWeeks((prev) => [...prev, weekStr].sort((a, b) => Number(a) - Number(b)));
    setWeekLabels((prev) => ({ ...prev, [weekStr]: event.name }));
    setGolfEvents((prev) => prev.filter((e) => e.id !== event.id));
  };

  if (loading) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: leagueName || "League", to: `/league/${leagueId}` },
            { label: `Season ${season}` },
          ]}
        />
        <p>Loading weeks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: leagueName || "League", to: `/league/${leagueId}` },
            { label: `Season ${season}` },
          ]}
        />
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: leagueName || "League", to: `/league/${leagueId}` },
          { label: `Season ${season}` },
        ]}
      />
      <div className="space-y-4 max-w-[90%] mx-auto">
        {weeks.map((w) => (
          <Accordion
            key={w}
            weekDoc={{ week: w, label: weekLabels[w] }}
            leagueId={leagueId!}
            season={season!}
            actualWeek={actualNFLWeek}
            sportLeague={sportLeague}
          />
        ))}
      </div>
      {sportLeague === 'GOLF' && golfEvents.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Available Tournaments
          </h3>
          {golfEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => handleCreateGolfWeek(event)}
              className="w-full text-left px-4 py-3 rounded bg-[#2a3447] hover:bg-[#344054] border border-[#3a465b] transition-colors"
            >
              <span className="text-white font-medium">{event.name}</span>
              <span className="text-gray-400 text-sm ml-2">— Create week</span>
            </button>
          ))}
        </div>
      )}
      {sportLeague === 'NFL' && (
        <div>Current NFL Week: {actualNFLWeek ?? "Unknown"}</div>
      )}
    </div>
  );
};

export default Weeks;
