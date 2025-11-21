import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Seasons from "./seasons";
import Breadcrumbs from "./breadcrumbs";
import { getCurrentUser } from "../api/auth";

const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.NX_API_BASE ||
  "http://localhost:3001";

const League = () => {
  const { leagueId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [league, setLeague] = useState({});
  const [member, setMember] = useState(null);
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

        if (cancelled) return;
        // Normalize user shape to always have an `id` field.
        setUser({ ...current, id: userId });

        // Fetch league and league users in parallel
        const [leagueRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/leagues/${leagueId}`, {
            credentials: "include",
          }),
          fetch(`${API_BASE}/leagues/${leagueId}/users`, {
            credentials: "include",
          }),
        ]);

        if (!leagueRes.ok) {
          throw new Error(
            `Failed to load league (status ${leagueRes.status})`
          );
        }
        if (!usersRes.ok) {
          throw new Error(
            `Failed to load league members (status ${usersRes.status})`
          );
        }

        const leagueData = await leagueRes.json();
        const users = await usersRes.json();

        if (cancelled) return;

        setLeague(leagueData || {});

        if (Array.isArray(users)) {
          const currentMember = users.find((u) => {
            const uId = u.userId || u.id;
            return uId && uId === userId;
          });
          setMember(currentMember || null);
        } else {
          setMember(null);
        }
      } catch (err) {
        console.error("Failed to load league", err);
        if (!cancelled) {
          setError(
            err && err.message ? err.message : "Failed to load league"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "League" },
          ]}
        />
        <p>Loading league...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "League" },
          ]}
        />
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-red-500">{error}</p>
        <button
          className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
          onClick={() => navigate("/dashboard")}
        >
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
      <Seasons leagueId={leagueId} />
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
            <button className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80">
              Go To Weekly Game
            </button>
          </Link>
        )}
    </div>
  );
};

export default League;
