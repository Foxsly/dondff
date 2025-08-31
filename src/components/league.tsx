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

// @ts-expect-error -- TODO: No overload matches this call.
  const leagueRef = doc(db, "leagues", leagueId)

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, (currentUser) => {
// @ts-expect-error -- TODO: Argument of type 'User | null' is not assignable to parameter of type 'SetStateAction<null>'.
      setUser(currentUser)
    })

    const leagueUnsub = onSnapshot(
      leagueRef,
      (doc) => {
// @ts-expect-error -- TODO: Argument of type 'DocumentData | undefined' is not assignable to parameter of type 'SetStateAction<{}>'.
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
// @ts-expect-error -- TODO: Property 'uid' does not exist on type 'never'.
    if (!user?.uid) return
// @ts-expect-error -- TODO: No overload matches this call. Property 'uid' does not exist on type 'never'.
    const memberRef = doc(db, "leagues", leagueId, "members", user.uid)
    const unsub = onSnapshot(
      memberRef,
      (doc) => {
// @ts-expect-error -- TODO: Argument of type 'DocumentData | undefined' is not assignable to parameter of type 'SetStateAction<null>'.
        setMember(doc.data())
      },
      (error) => {
        console.log(error)
      }
    )
    return () => unsub()
  }, [user, leagueId])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
// @ts-expect-error -- TODO: Property 'name' does not exist on type '{}'.
          { label: league.name },
        ]}
      />
// @ts-expect-error -- TODO: Property 'name' does not exist on type '{}'.
      <h2 className="text-2xl font-bold">{league.name}</h2>
// @ts-expect-error -- TODO: Property 'accessCode' does not exist on type '{}'.
      <p>Access Code: {league.accessCode}</p>
// @ts-expect-error -- TODO: Property 'role' does not exist on type 'never'.
      {member?.role === "player" && (
// @ts-expect-error -- TODO: Property 'lineupStatus' does not exist on type 'never'.
        <p>Lineup Status: {member.lineupStatus || "Not set"}</p>
      )}
      <h4 className="text-lg font-semibold">Seasons:</h4>
      <Seasons leagueId={leagueId} />
// @ts-expect-error -- TODO: Property 'role' does not exist on type 'never'. Property 'currentSeason' does not exist on type '{}'. Property 'currentWeek' does not exist on type '{}'.
      {member?.role === "player" && league.currentSeason && league.currentWeek && (
        <Link
          to="/game/setting-lineups"
          state={{
            leagueId: leagueId,
// @ts-expect-error -- TODO: Property 'currentSeason' does not exist on type '{}'.
            season: league.currentSeason,
// @ts-expect-error -- TODO: Property 'currentWeek' does not exist on type '{}'.
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
