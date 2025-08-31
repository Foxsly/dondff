import React, { useState } from "react";
import { auth, db } from "../firebase-config";
import { collection, doc, DocumentData, setDoc } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { Link } from "react-router-dom";

function roundToTwo(number: number) {
  return Math.round(number * 100) / 100;
}

interface EntriesProps {
leagueId: any;
season: any;
week: any;
actualWeek: any;
}

const Entries = ({ leagueId, season, week, actualWeek }: EntriesProps) => {
  const user = auth.currentUser;

  const entriesCollection = collection(db, "leagues", leagueId, "seasons", season, "weeks", week, "entries");
// @ts-expect-error -- TODO: Object literal may only specify known properties, and 'idField' does not exist in type 'Options & IDOptions<DocumentData> & InitialValueOptions<DocumentData[]>'.
  const [entries] = useCollectionData(entriesCollection, { idField: "id" });

  const membersCollection = collection(db, "leagues", leagueId, "members");
// @ts-expect-error -- TODO: Object literal may only specify known properties, and 'idField' does not exist in type 'Options & IDOptions<DocumentData> & InitialValueOptions<DocumentData[]>'.
  const [members] = useCollectionData(membersCollection, { idField: "id" });

// @ts-expect-error -- TODO: Parameter 'id' implicitly has an 'any' type.
  const memberLabel = (id) => {
    const member = members?.find((member) => member.id === id);
    return (
      member?.displayName ||
      member?.email ||
      member?.uid ||
      id
    );
  };

  const hasEntry = !!entries?.some((entry) => entry.id === user?.uid);

  const currentMember = members?.find((member) => member.id === user?.uid);
  const isAdmin = currentMember?.role === "admin";
  const [selectedUids, setSelectedUids] = useState([]);

// @ts-expect-error -- TODO: Parameter 'uid' implicitly has an 'any' type.
  const toggleUid = (uid) => {
// @ts-expect-error -- TODO: Argument of type '(prev: never[]) => any[]' is not assignable to parameter of type 'SetStateAction<never[]>'.
    setSelectedUids((prev) =>
// @ts-expect-error -- TODO: Argument of type 'any' is not assignable to parameter of type 'never'.
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  };

  const sortedEntries = entries
    ? [...entries].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    : [];

  const projectedTotal = (entry: DocumentData) =>
    (entry.lineUp?.RB?.points ?? 0) + (entry.lineUp?.WR?.points ?? 0);

  const calculateScores = async () => {
    if (!entries) return;
    const rbUrl = `https://api.sleeper.com/stats/nfl/${season}/${week}?season_type=regular&position=RB&order_by=pts_ppr`;
    const wrUrl = `https://api.sleeper.com/stats/nfl/${season}/${week}?season_type=regular&position=WR&order_by=pts_ppr`;
    const rbResponse = await fetch(rbUrl);
    const wrResponse = await fetch(wrUrl);
    const rbJson = await rbResponse.json();
    const wrJson = await wrResponse.json();
    const finalStats = [...rbJson, ...wrJson];

    // Set PPR scores on the entries
    // Doing this mutably isn't great, but I don't understand the code well enough to refactor more
    entries.forEach((entry) => {
      const rbId = entry.lineUp?.RB?.playerId;
      const wrId = entry.lineUp?.WR?.playerId;
      const rb = finalStats.find((player) => player.player_id === rbId);
      const wr = finalStats.find((player) => player.player_id === wrId);
      entry.lineUp.RB.pprScore = rb && rb.stats.pts_ppr ? rb.stats.pts_ppr : 0.0;
      entry.lineUp.WR.pprScore = wr && wr.stats.pts_ppr ? wr.stats.pts_ppr : 0.0;
      let finalScore = entry.lineUp.RB.pprScore + entry.lineUp.WR.pprScore;
      entry.lineUp.finalScore = finalScore;
      entry.finalScore = finalScore;
    });

    for (const entry of entries) {
      const docRef = doc(db, "leagues", leagueId, "seasons", season, "weeks", week, "entries", entry.id);

      await setDoc(docRef, {
        name: entry.name || entry.id,
        lineUp: entry.lineUp,
        finalScore: entry.finalScore,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border border-[#3a465b]">
          <thead className="bg-[#3a465b]">
            <tr>
              <th className="p-2 border-b border-[#3a465b]">Member</th>
              <th className="p-2 border-b border-[#3a465b]">RB</th>
              <th className="p-2 border-b border-[#3a465b]">RB Projection</th>
              <th className="p-2 border-b border-[#3a465b]">WR</th>
              <th className="p-2 border-b border-[#3a465b]">WR Projection</th>
              <th className="p-2 border-b border-[#3a465b]">Projected Total</th>
              <th className="p-2 border-b border-[#3a465b]">Final Score</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <tr key={entry.id} className="odd:bg-[#3a465b]/20">
                <td className="p-2 border-b border-[#3a465b]">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      className="mr-2"
// @ts-expect-error -- TODO: Argument of type 'any' is not assignable to parameter of type 'never'.
                      checked={selectedUids.includes(entry.id)}
                      onChange={() => toggleUid(entry.id)}
                    />
                  )}
                  {memberLabel(entry.id)}
                </td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.RB?.name ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.WR?.name ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(projectedTotal(entry))}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.finalScore ? roundToTwo(entry.finalScore) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {entries && !hasEntry && user && (
        <Link
          to="/game/setting-lineups"
          state={{
            leagueId: leagueId,
            season: season,
            week: week,
          }}
        >
          <button className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80">
            Play Game
          </button>
        </Link>
      )}
      {isAdmin && (
        <Link
          to="/game/group"
          state={{
            leagueId: leagueId,
            season: season,
            week: week,
            participants: selectedUids,
          }}
        >
          <button
            className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80 disabled:opacity-50"
            disabled={selectedUids.length === 0}
          >
            Start Group Game
          </button>
        </Link>
      )}
      {actualWeek > parseInt(week) && isAdmin && (
        <button
          className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
          onClick={calculateScores}
        >
          Calculate Scores
        </button>
      )}
    </div>
  );
};

export default Entries;
