import React, { useState } from "react";
import { db } from "../firebase-config";
import { collection, doc, setDoc } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { Link } from "react-router-dom";

interface SeasonsProps {
leagueId: string | undefined | string[];
}

const Seasons = ({ leagueId }: SeasonsProps) => {
  const [year, setYear] = useState("");

// @ts-expect-error -- TODO: No overload matches this call.
  const leagueCollection = collection(db, "leagues", leagueId, "seasons");
  const [docs, loading] = useCollectionData(leagueCollection);

  const addSeason = async (year: React.SetStateAction<string>) => {
    setYear(year);
    try {
// @ts-expect-error -- TODO: No overload matches this call.
      const docRef = doc(db, "leagues", leagueId, "seasons", year);
      await setDoc(docRef, {
        season: year,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-4">
      {loading && "Loading..."}
      <div className="flex flex-wrap gap-2">
        {docs?.map((doc) => (
          <Link
            key={doc.season}
            to={`/league/${leagueId}/season/${doc.season}`}
            className="px-3 py-1 rounded bg-[#3a465b] hover:bg-[#3ab4cc]"
          >
            {doc.season}
          </Link>
        ))}
      </div>

      <button
        className="px-4 py-2 font-bold text-[#102131] bg-[#00ceb8] rounded hover:bg-[#00ceb8]/80"
        onClick={() => addSeason("2025")}
      >
        Add 2025 Season
      </button>
    </div>
  );
};

export default Seasons;
