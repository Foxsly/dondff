import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Seasons from "./seasons";
import Breadcrumbs from "./breadcrumbs";
import { getCurrentUser } from "../api/auth";
import type { League as LeagueType, LeagueMember, LeagueSettings, SportLeague } from "../types";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

const League: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();

  const [league, setLeague] = useState<LeagueType>({});
  const [member, setMember] = useState<LeagueMember | null>(null);
  const [sportLeague, setSportLeague] = useState<SportLeague>('NFL');
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

        if (cancelled) return;

        const [leagueRes, usersRes, settingsRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}`, { credentials: "include" }),
          fetch(`${API_BASE}/leagues/${leagueId}/users`, { credentials: "include" }),
            //TODO this should come from the League now
          fetch(`${API_BASE}/leagues/${leagueId}/settings/latest`, { credentials: "include" }),
        ]);

        if (!leagueRes.ok) throw new Error(`Failed to load league (status ${leagueRes.status})`);
        if (!usersRes.ok) throw new Error(`Failed to load league members (status ${usersRes.status})`);

        const leagueData: LeagueType = await leagueRes.json();
        const users: LeagueMember[] = await usersRes.json();

        let sport: SportLeague = 'NFL';
        if (settingsRes.ok) {
          const settings: LeagueSettings = await settingsRes.json();
          sport = settings.sportLeague || 'NFL';
        }

        if (cancelled) return;

        setSportLeague(sport);
        setLeague(leagueData || {});

        if (Array.isArray(users)) {
          const currentMember = users.find((u) => {
            const uId = u.userId;
            return uId && uId === userId;
          });
          setMember(currentMember || null);
        } else {
          setMember(null);
        }
      } catch (err: any) {
        console.error("Failed to load league", err);
        if (!cancelled) setError(err?.message ?? "Failed to load league");
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
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "League" }]} />
        <p>Loading league...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "League" }]} />
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-red-500">{error}</p>
        <button className="btn-primary" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: league.name || "League" },
        ]}
      />
      <h2 className="text-2xl font-bold">{league.name}</h2>
      <p>Access Code: {league.id || leagueId}</p>
      {member?.role === "player" && (
        <p>Lineup Status: {member.lineupStatus || "Not set"}</p>
      )}
      <h4 className="text-lg font-semibold">Seasons:</h4>
      {sportLeague && (
        <span className="text-sm px-2 py-0.5 rounded bg-[#00ceb8]/20 text-[#00ceb8]">
          {sportLeague}
        </span>
      )}
      <Seasons leagueId={leagueId!} sportLeague={sportLeague} />
      {member?.role === "player" &&
        league.currentSeason &&
        league.currentWeek && (
          <Link
            to="/game/setting-lineups"
            state={{
              leagueId: leagueId,
              season: league.currentSeason,
              week: league.currentWeek,
            }}
          >
            <button className="btn-primary">Go To Weekly Game</button>
          </Link>
        )}
    </div>
  );
};

export default League;
