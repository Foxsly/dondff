import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import Breadcrumbs from "./breadcrumbs";
import {getCurrentUser} from "../api/auth";

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [newLeague, setNewLeague] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await getCurrentUser();
        const userId = current && (current.id || current.userId);
        if (!userId) {
          console.warn("No user id found on current user", current);
          if (!cancelled) {
            navigate("/");
          }
          return;
        }

        if (!current) {
          // No user in local auth state; send them back to sign-in.
          if (!cancelled) {
            navigate("/");
          }
          return;
        }

        if (cancelled) return;
        setUser({...current, id: current.id || current.userId});

        // Fetch leagues for this user from the backend.
        // Expects backend to expose GET /users/:userId/leagues.
        const res = await fetch(
          `${API_BASE}/users/${userId}/leagues`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to load leagues (status ${res.status})`
          );
        }

        const data = await res.json();
        if (!cancelled) {
          setLeagues(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        if (!cancelled) {
          setError(
            err && err.message
              ? err.message
              : "Failed to load dashboard"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Wire create league to backend leagues endpoints.
  const addLeague = async () => {
    const name = newLeague.trim();
    if (!name) return;
    console.log(user);
    const userId = user && (user.id || user.userId);
    if (!userId) {
      console.warn("Cannot create league: user is not loaded");
      return;
    }

    try {
      setError("");

      // 1. Create the league
      const createRes = await fetch(`${API_BASE}/leagues`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify({name}),
      });

      if (!createRes.ok) {
        throw new Error(`Failed to create league (status ${createRes.status})`);
      }

      const createdLeague = await createRes.json();

      // 2. Add current user as an admin/member of the league
      try {
        const memberRes = await fetch(
          `${API_BASE}/leagues/${createdLeague.id || createdLeague.leagueId}/users`,
          {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            credentials: "include",
            body: JSON.stringify({userId, role: "admin"}),
          }
        );

        if (!memberRes.ok) {
          // Not fatal for league existence, but log it so it can be fixed.
          console.error(
            "Failed to add user to league after creation",
            memberRes.status
          );
        }
      } catch (err) {
        console.error("Error while adding user to league", err);
      }

      // 3. Refresh the leagues list for this user
      try {
        const leaguesRes = await fetch(
          `${API_BASE}/users/${userId}/leagues`,
          {
            credentials: "include",
          }
        );
        if (leaguesRes.ok) {
          const data = await leaguesRes.json();
          setLeagues(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to refresh leagues list", err);
      }

      setNewLeague("");
      setShowCreateForm(false);
    } catch (err) {
      console.error("Failed to create league", err);
      setError(
        err && err.message ? err.message : "Failed to create league"
      );
    }
  };

  const joinLeague = async () => {
    const code = joinCode.trim();
    if (!code) return;

    const userId = user && (user.id || user.userId);
    if (!userId) {
      console.warn("Cannot join league: user is not loaded");
      return;
    }

    try {
      setError("");

      // 1. Attempt to add the current user to the league by code/id.
      // For now, we treat `code` as the league id.
      const memberRes = await fetch(
        `${API_BASE}/leagues/${code}/users`,
        {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          credentials: "include",
          body: JSON.stringify({userId, role: "player"}),
        }
      );

      if (!memberRes.ok) {
        throw new Error(
          `Failed to join league (status ${memberRes.status})`
        );
      }

      // 2. Refresh the leagues list for this user.
      try {
        const leaguesRes = await fetch(
          `${API_BASE}/users/${userId}/leagues`,
          {
            credentials: "include",
          }
        );
        if (leaguesRes.ok) {
          const data = await leaguesRes.json();
          setLeagues(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to refresh leagues list after join", err);
      }

      setJoinCode("");
      setShowJoinForm(false);
    } catch (err) {
      console.error("Failed to join league", err);
      setError(
        err && err.message ? err.message : "Failed to join league"
      );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{label: "Dashboard"}]}/>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={[{label: "Dashboard"}]}/>
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-red-500">{error}</p>
        <button
          className="btn-primary"
          onClick={() => navigate("/")}
        >
          Return to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs items={[{label: "Dashboard"}]}/>
      <h2 className="text-2xl font-bold">Welcome to Your Dashboard</h2>
      <h3 className="text-xl">{user?.email ?? ""}</h3>

      <h4 className="text-lg font-semibold mt-4">Leagues:</h4>
      {leagues.length === 0 && (
        <p className="text-sm text-gray-300">
          You are not a member of any leagues yet.
        </p>
      )}
      {leagues.map((league) => {
        const role =
          league.role || league.membershipRole || league.userRole || "Player";
        return (
          <div
            key={league.id || league.leagueId}
            className="flex items-center justify-between p-4 mb-2 rounded bg-[#3a465b]/50"
          >
            <p className="font-semibold">
              {league.name || league.leagueName || "Unnamed League"}
            </p>
            <p>{role === "admin" ? "Admin" : role}</p>
            <button
              className="px-3 py-1 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
              onClick={() =>
                navigate(`/league/${league.id || league.leagueId}`)
              }
            >
              View
            </button>
          </div>
        );
      })}

      <div className="flex gap-4 mt-4">
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          Create League
        </button>
        <button
          className="btn-primary"
          onClick={() => setShowJoinForm(!showJoinForm)}
        >
          Join League
        </button>
      </div>

      {showCreateForm && (
        <div className="flex mt-4 space-x-2">
          <input
            className="flex-1 p-2 bg-transparent border rounded border-[#3a465b]"
            placeholder="Enter League Name..."
            value={newLeague}
            onChange={(e) => setNewLeague(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={addLeague}
          >
            Submit
          </button>
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
          <button
            className="btn-primary"
            onClick={joinLeague}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
