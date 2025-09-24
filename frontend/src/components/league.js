import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { auth, db } from "../firebase-config";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Seasons from "./seasons";
import Breadcrumbs from "./breadcrumbs";

const League = () => {

  let { leagueId } = useParams()

  const [user, setUser] = useState(null)
  const [league, setLeague] = useState({})
  const [member, setMember] = useState(null)

  const leagueRef = doc(db, "leagues", leagueId)

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })

    const leagueUnsub = onSnapshot(
      leagueRef,
      (doc) => {
        setLeague(doc.data())
      },
      (error) => {
        console.log(error)
      }
    )

    return () => {
      authUnsub()
      leagueUnsub()
    }
  }, [leagueRef])

  useEffect(() => {
    if (!user?.uid) return
    const memberRef = doc(db, "leagues", leagueId, "members", user.uid)
    const unsub = onSnapshot(
      memberRef,
      (doc) => {
        setMember(doc.data())
      },
      (error) => {
        console.log(error)
      }
    )
    return () => unsub()
  }, [user, leagueId])

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: league.name },
        ]}
      />
      <h2 className="text-2xl font-bold">{league.name}</h2>
      <p>Access Code: {league.accessCode}</p>
      {member?.role === "player" && (
        <p>Lineup Status: {member.lineupStatus || "Not set"}</p>
      )}
      <h4 className="text-lg font-semibold">Seasons:</h4>
      <Seasons leagueId={leagueId} />
      {member?.role === "player" && league.currentSeason && league.currentWeek && (
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
