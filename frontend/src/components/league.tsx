import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Seasons from "./seasons";
import Breadcrumbs from "./breadcrumbs";
import { getCurrentUser } from "../api/auth";
import { getLeagueUsers } from "../api/leagues";
import { useLeague } from "../contexts/LeagueContext";
import LoadingSpinner from "./ui/LoadingSpinner";
import ErrorDisplay from "./ui/ErrorDisplay";
import type { LeagueMember } from "../types";

const League: React.FC = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { league, sportConfig, loading: leagueLoading, error: leagueError } = useLeague();

  const [member, setMember] = useState<LeagueMember | null>(null);
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

        if (cancelled) return;

        const users = await getLeagueUsers(leagueId!);

        if (cancelled) return;

        if (Array.isArray(users)) {
          const currentMember = users.find((u) => u.userId === userId);
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

    return () => { cancelled = true; };
  }, [leagueId, navigate]);

  const isLoading = loading || leagueLoading;
  const displayError = error || leagueError;

  if (isLoading) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "League" }]} />
        <LoadingSpinner message="Loading league..." />
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "League" }]} />
        <ErrorDisplay message={displayError} action={{ label: "Return to Dashboard", onClick: () => navigate("/dashboard") }} />
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: league?.name || "League" },
        ]}
      />
      <h2 className="text-2xl font-bold">{league?.name}</h2>
      <p>Access Code: {league?.id || leagueId}</p>
      {member?.role === "player" && (
        <p>Lineup Status: {member.lineupStatus || "Not set"}</p>
      )}
      <h4 className="text-lg font-semibold">Seasons:</h4>
      {sportConfig && (
        <span className="text-sm px-2 py-0.5 rounded bg-[#00ceb8]/20 text-[#00ceb8]">
          {sportConfig.displayName}
        </span>
      )}
      <Seasons leagueId={leagueId!} />
      {member?.role === "player" &&
        league?.currentSeason &&
        league?.currentWeek && (
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
