import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Accordion from "./accordion";
import Breadcrumbs from "./breadcrumbs";
import { getCurrentUser } from "../api/auth";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

const Weeks = () => {
  const { leagueId, season } = useParams();
  const navigate = useNavigate();

  const [weeks, setWeeks] = useState([]);
  const [actualNFLWeek, setActualNFLWeek] = useState(null);
  const [leagueName, setLeagueName] = useState("");
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
          if (!cancelled) {
            navigate("/");
          }
          return;
        }

        const userId = current.id || current.userId;
        if (!userId) {
          console.warn("No user id found on current user", current);
          if (!cancelled) {
            navigate("/");
          }
          return;
        }

        // Fetch league details, all teams, and the current Sleeper state in parallel.
        const [leagueRes, teamsRes, stateRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/teams`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/sleeper/state`, {
            credentials: "include",
          }),
        ]);

        if (!leagueRes.ok) {
          throw new Error(
            `Failed to load league (status ${leagueRes.status})`
          );
        }
        if (!teamsRes.ok) {
          throw new Error(
            `Failed to load teams (status ${teamsRes.status})`
          );
        }
        if (!stateRes.ok) {
          throw new Error(
            `Failed to load Sleeper state (status ${stateRes.status})`
          );
        }

        const leagueData = await leagueRes.json();
        const teams = await teamsRes.json();
        const sleeperState = await stateRes.json();

        if (cancelled) return;

        setLeagueName(leagueData?.name || "");

        const weekSet = new Set();

        // Derive weeks from teams that belong to this league and season.
        if (Array.isArray(teams)) {
          const leagueTeams = teams.filter((team) => {
            const teamLeagueId = team.leagueId;
            const teamSeason = team.seasonYear;

            const matchesLeague = teamLeagueId && String(teamLeagueId) === String(leagueId);
            const matchesSeason = !season || (teamSeason && String(teamSeason) === String(season));

            return matchesLeague && matchesSeason;
          });

          leagueTeams.forEach((team) => {
            const teamWeek = team.week;
            if (teamWeek != null) {
              weekSet.add(String(teamWeek));
            }
          });
        }

        // Append the current NFL week from Sleeper state if available.
        if (sleeperState) {
          const currentWeek = sleeperState.week;
          if (currentWeek != null) {
            setActualNFLWeek(Number(currentWeek));
            weekSet.add(String(currentWeek));
          }
        }

        const derivedWeeks = Array.from(weekSet);
        derivedWeeks.sort((a, b) => Number(a) - Number(b));

        setWeeks(derivedWeeks);
      } catch (err) {
        console.error("Failed to load weeks", err);
        if (!cancelled) {
          setError(
            err && err.message ? err.message : "Failed to load weeks"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
            weekDoc={{ week: w }}
            leagueId={leagueId}
            season={season}
            actualWeek={actualNFLWeek}
          />
        ))}
      </div>
      <div>Current NFL Week: {actualNFLWeek ?? "Unknown"}</div>
    </div>
  );
};

export default Weeks;
