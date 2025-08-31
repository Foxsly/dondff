import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {auth, db} from "../firebase-config";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import Accordion from "./accordion";
import Breadcrumbs from "./breadcrumbs";

const Weeks = () => {
  const { leagueId, season } = useParams();
  const [week, setWeek] = useState("1");
  const [actualNFLWeek, setActualNFLWeek] = useState(null);
  const [leagueName, setLeagueName] = useState("");
  const user = auth.currentUser;

// @ts-expect-error -- TODO: No overload matches this call.
  const leagueCollection = collection(db, "leagues", leagueId, "seasons", season, "weeks");
  const [docs, loading] = useCollectionData(leagueCollection);

// @ts-expect-error -- TODO: No overload matches this call.
  const membersCollection = collection(db, "leagues", leagueId, "members");
// @ts-expect-error -- TODO: Object literal may only specify known properties, and 'idField' does not exist in type 'Options & IDOptions<DocumentData> & InitialValueOptions<DocumentData[]>'.
  const [members] = useCollectionData(membersCollection, { idField: "id" });
  const currentMember = members?.find((m) => m.uid === user?.uid);
  const isAdmin = currentMember?.role === "admin";

  useEffect(() => {
// @ts-expect-error -- TODO: No overload matches this call.
    const leagueRef = doc(db, "leagues", leagueId);
    const unsub = onSnapshot(leagueRef, (snap) => {
      setLeagueName(snap.data()?.name || "");
    });
    return () => unsub();
  }, [leagueId]);

  const getActualWeek = async () => {
    try {
      const url = "https://api.sleeper.app/v1/state/nfl";
      const response = await fetch(url);
      const json = await response.json();
      const actualWeek = json.week;
      setActualNFLWeek(actualWeek);
    } catch (error) {
      console.log(error);
    }
  };

  const addWeek = async () => {
    try {
// @ts-expect-error -- TODO: No overload matches this call.
      const docRef = doc(db, "leagues", leagueId, "seasons", season, "weeks", week);
      await setDoc(docRef, {
        week: week,
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getActualWeek();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: leagueName, to: `/league/${leagueId}` },
          { label: `Season ${season}` },
        ]}
      />
      {loading && "Loading..."}
      <div className="space-y-4 max-w-[90%] mx-auto">
        {docs?.sort((a, b) => a.week - b.week).map((weekDoc) => (
          <Accordion
            key={weekDoc.week}
            weekDoc={weekDoc}
            leagueId={leagueId}
            season={season}
            actualWeek={actualNFLWeek}
          />
        ))}
      </div>
      { isAdmin && (
      <div className="flex items-center gap-2 mt-4">
        <label className="flex items-center gap-2">
          select NFL week:
          <select
            className="p-1 bg-transparent border rounded border-[#3a465b]"
            value={week}
            onChange={(e) => setWeek(e.target.value)}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
            <option value="13">13</option>
            <option value="14">14</option>
            <option value="15">15</option>
            <option value="16">16</option>
            <option value="17">17</option>
            <option value="18">18</option>
          </select>
        </label>
        <button
          className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
          onClick={addWeek}
        >
          Add Week
        </button>
      </div>
      )}
      <div>Current NFL Week: {actualNFLWeek}</div>
    </div>
  );
};

export default Weeks;
