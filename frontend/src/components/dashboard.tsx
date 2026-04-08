import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {getCurrentUser} from "../api/auth";
import {addLeagueUser, createLeague} from "../api/leagues";
import {getUserLeagues} from "../api/users";
import {getAllSports} from "../sports/registry";
import type {League, SportLeague, User} from "../types";
import Breadcrumbs from "./breadcrumbs";
import ErrorDisplay from "./ui/ErrorDisplay";
import LoadingSpinner from "./ui/LoadingSpinner";

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [newLeague, setNewLeague] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sportLeague, setSportLeague] = useState<SportLeague>("NFL");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const sports = getAllSports();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await getCurrentUser();
        const userId = current?.userId;
        if (!userId) {
          if (!cancelled) navigate("/");
          return;
        }

        if (!current) {
          if (!cancelled) navigate("/");
          return;
        }

        if (cancelled) return;
        setUser({ ...current, id: current.userId });

        const data = await getUserLeagues(userId);
        if (!cancelled) {
          setLeagues(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        console.error("Failed to load dashboard data", err);
        if (!cancelled) {
          setError(err?.message ?? "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => { cancelled = true; };
  }, [navigate]);

  const addLeagueHandler = async () => {
    const name = newLeague.trim();
    if (!name) return;
    const userId = user?.userId;
    if (!userId) return;

    try {
      setError("");

      const createdLeague = await createLeague({ name, sportLeague });

      try {
        await addLeagueUser(createdLeague.leagueId!, { userId, role: "admin" });
      } catch (err) {
        console.error("Error while adding user to league", err);
      }

      try {
        const data = await getUserLeagues(userId);
        setLeagues(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to refresh leagues list", err);
      }

      setNewLeague("");
      setSportLeague("NFL");
      setShowCreateForm(false);
    } catch (err: any) {
      console.error("Failed to create league", err);
      setError(err?.message ?? "Failed to create league");
    }
  };

  const joinLeague = async () => {
    const code = joinCode.trim();
    if (!code) return;

    const userId = user?.userId;
    if (!userId) return;

    try {
      setError("");

      await addLeagueUser(code, { userId, role: "player" });

      try {
        const data = await getUserLeagues(userId);
        setLeagues(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to refresh leagues list after join", err);
      }

      setJoinCode("");
      setShowJoinForm(false);
    } catch (err: any) {
      console.error("Failed to join league", err);
      setError(err?.message ?? "Failed to join league");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <LoadingSpinner message="Loading your dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <ErrorDisplay message={error} action={{ label: "Return to Sign In", onClick: () => navigate("/") }} />
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs items={[{ label: "Dashboard" }]} />
      <h2 className="text-2xl font-bold">Welcome to Your Dashboard</h2>
      <h3 className="text-xl">{user?.email ?? ""}</h3>

      <h4 className="text-lg font-semibold mt-4">Leagues:</h4>
      {leagues.length === 0 && (
        <p className="text-sm text-gray-300">
          You are not a member of any leagues yet.
        </p>
      )}
      {leagues.map((league) => {
          return (
          <div
            key={league.leagueId}
            className="flex items-center justify-between p-4 mb-2 rounded bg-[#3a465b]/50"
          >
            <div className="flex items-center gap-2">
              <p className="font-semibold">
                {league.name || "Unnamed League"}
              </p>
              {league.sportLeague && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#00ceb8]/20 text-[#00ceb8]">
                  {league.sportLeague}
                </span>
              )}
            </div>
            <p>{league.role === "admin" ? "Admin" : league.role}</p>
            <button
              className="px-3 py-1 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
              onClick={() => navigate(`/league/${league.leagueId}`)}
            >
              View
            </button>
          </div>
        );
      })}

      <div className="flex gap-4 mt-4">
        <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
          Create League
        </button>
        <button className="btn-primary" onClick={() => setShowJoinForm(!showJoinForm)}>
          Join League
        </button>
      </div>

      {showCreateForm && (
        <div className="mt-4 space-y-2">
          <div className="flex space-x-2">
            <input
              className="flex-1 p-2 bg-transparent border rounded border-[#3a465b]"
              placeholder="Enter League Name..."
              value={newLeague}
              onChange={(e) => setNewLeague(e.target.value)}
            />
            <select
              className="p-2 bg-[#102131] border rounded border-[#3a465b] text-white"
              value={sportLeague}
              onChange={(e) => setSportLeague(e.target.value as SportLeague)}
            >
              {sports.map((sport) => (
                <option key={sport.key} value={sport.key}>{sport.displayName}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={addLeagueHandler}>
              Submit
            </button>
          </div>
        </div>
      )}

      {showJoinForm && (
        <div className="flex mt-4 space-x-2">
          <input
            className="flex-1 p-2 bg-transparent border rounded border-[#3a465b]"
            placeholder="Enter Access Code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button className="btn-primary" onClick={joinLeague}>
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
