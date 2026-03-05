import React, { useState } from "react";
import Entries from "./entries";

interface WeekDoc {
  week: string | number;
}

interface AccordionProps {
  weekDoc: WeekDoc;
  leagueId: string;
  season: string;
  actualWeek: number | null;
}

const Accordion: React.FC<AccordionProps> = ({ weekDoc, leagueId, season, actualWeek }) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="accordion-item">
      <div className="accordion-title" onClick={() => setIsActive(!isActive)}>
        <div>Week {weekDoc.week}</div>
        <div>{isActive ? '-' : '+'}</div>
      </div>
      {isActive && (
        <div className="accordion-content">
          <Entries
            leagueId={leagueId}
            season={season}
            week={weekDoc.week}
            actualWeek={actualWeek}
          />
        </div>
      )}
    </div>
  );
};

export default Accordion;
