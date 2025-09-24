import React, { useState } from "react";
import { auth, db } from "../firebase-config";
import { collection, doc, setDoc } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE;

function roundToTwo(number) {
  return Math.round(number * 100) / 100;
}

const entryConverter = {
  fromFirestore(
    snapshot,
    options
  ) {
    const data = snapshot.data();
    data.id = snapshot.id;
    return data;
  }
};

const Entries = ({ leagueId, season, week, actualWeek }) => {
  const user = auth.currentUser;

  const entriesCollection = collection(db, "leagues", leagueId, "seasons", season, "weeks", week, "entries").withConverter(entryConverter);
  const [entries] = useCollectionData(entriesCollection);

  const membersCollection = collection(db, "leagues", leagueId, "members");
  const [members] = useCollectionData(membersCollection, { idField: "id" });

  const memberLabel = (email) => {
    const member = members?.find((member) => member.email === email);
    return (
      member?.displayName ||
      member?.email ||
      member?.uid ||
      email
    );
  };

  const membersWithEntries = new Set(entries?.map((entry) => entry.name));
  const unplayedMembers = members?.filter((member) => !membersWithEntries.has(member.email));

  const hasEntry = !!entries?.some((entry) => entry.name === user?.email);

  const currentMember = members?.find((member) => member.uid === user?.uid);
  const isAdmin = currentMember?.role === "admin";
  const [selectedUids, setSelectedUids] = useState([]);

  const toggleUid = (uid) => {
    setSelectedUids((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  };

  const sortedEntries = entries
    ? [...entries].sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    : [];

    //helpers for if week is finalized
    const weekNum = Number(week);
    const actualWeekNum = Number(actualWeek);
    const isCurrentWeek = weekNum === actualWeekNum;

    //check to see if finalScores have been calculated. Used to switch table displays
  const allHaveFinal = (entries ?? []).length > 0 &&
  (entries ?? []).every(e => typeof e?.finalScore === "number");

  const showResults = !isCurrentWeek && allHaveFinal;

  const projectedTotal = (entry) =>
    (entry.lineUp?.RB?.points ?? 0) + (entry.lineUp?.WR?.points ?? 0);

  const calculateScores = async () => {
    if (!entries) return;
    const rbUrl = `${API_BASE}/sleeper/stats/${season}/${week}?position=RB`;
    const wrUrl = `${API_BASE}/sleeper/stats/${season}/${week}?position=WR`;
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

  function ResultsTable({ entries }) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border border-[#3a465b]">
          <thead className="bg-[#3a465b]">
            <tr>
              <th className="p-2 border-b border-[#3a465b]">Member</th>
              <th className="p-2 border-b border-[#3a465b]">RB</th>
              <th className="p-2 border-b border-[#3a465b]">RB Projection</th>
              <th className="p-2 border-b border-[#3a465b]">RB Final</th>
              <th className="p-2 border-b border-[#3a465b]">WR</th>
              <th className="p-2 border-b border-[#3a465b]">WR Projection</th>
              <th className="p-2 border-b border-[#3a465b]">WR Final</th>
              <th className="p-2 border-b border-[#3a465b]">Projected Total</th>
              <th className="p-2 border-b border-[#3a465b]">Final Score</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.name} className="odd:bg-[#3a465b]/20">
                <td className="p-2 border-b border-[#3a465b]">{memberLabel(entry.name)}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.RB?.name ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.pprScore) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.WR?.name ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.points) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.pprScore) ?? 0}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(projectedTotal(entry))}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.finalScore ? roundToTwo(entry.finalScore) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

    function ProjectionsTable({ entries }) {
    return (
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
              
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.name} className="odd:bg-[#3a465b]/20">
                <td className="p-2 border-b border-[#3a465b]">{memberLabel(entry.name)}</td>
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.RB?.name ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.RB?.points) ?? 0}</td>
                
                <td className="p-2 border-b border-[#3a465b]">{entry.lineUp?.WR?.name ?? ""}</td>
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(entry.lineUp?.WR?.points) ?? 0}</td>
                
                <td className="p-2 border-b border-[#3a465b]">{roundToTwo(projectedTotal(entry))}</td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showResults ? (
        <ResultsTable entries={sortedEntries} />
      ) : (
        <ProjectionsTable entries={sortedEntries} />
      )}
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
      {isAdmin && unplayedMembers.length > 0 && (
        <>
          <div className="space-y-4">
            {unplayedMembers.map((member) => (
              <>
              <input
                type="checkbox"
                className="mr-2"
                // checked={selectedUids.includes(entry.name)}
                onChange={() => toggleUid(member.email)}
              /> {member.email}
                <br/>
              </>
              ))}
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
          </div>
        </>
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
