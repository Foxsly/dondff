import React, { useState } from "react";
import Entries from "./entries";
import type { SportLeague } from "../types";

interface WeekDoc {
  week: string | number;
  label?: string;
}

interface AccordionProps {
  weekDoc: WeekDoc;
  leagueId: string;
  season: string;
  actualWeek: number | null;
  sportLeague?: SportLeague;
}

const Accordion: React.FC<AccordionProps> = ({ weekDoc, leagueId, season, actualWeek, sportLeague }) => {
  const [isActive, setIsActive] = useState(false);

  const weekTitle = sportLeague === 'GOLF' && weekDoc.label
    ? `Event: ${weekDoc.label}`
    : `Week ${weekDoc.week}`;

  return (
    <div className="accordion-item">
      <div className="accordion-title" onClick={() => setIsActive(!isActive)}>
        <div>{weekTitle}</div>
        <div>{isActive ? '-' : '+'}</div>
      </div>
      {isActive && (
        <div className="accordion-content">
          <Entries
            leagueId={leagueId}
            season={season}
            week={weekDoc.week}
            actualWeek={actualWeek}
            sportLeague={sportLeague}
          />
        </div>
      )}
    </div>
  );
};

export default Accordion;
