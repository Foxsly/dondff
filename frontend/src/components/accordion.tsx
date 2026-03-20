import React, {useState} from "react";
import {useLeague} from "../contexts/LeagueContext";
import Entries from "./entries";

interface WeekDoc {
  week: string | number;
  label?: string;
}

interface AccordionProps {
  weekDoc: WeekDoc;
  leagueId: string;
  season: string;
  actualWeek: number | null;
}

const Accordion: React.FC<AccordionProps> = ({ weekDoc, leagueId, season, actualWeek }) => {
  const [isActive, setIsActive] = useState(false);
  const { sportConfig } = useLeague();

  const weekTitle = sportConfig?.weekLabel === 'Event' && weekDoc.label
    ? `Event: ${weekDoc.label}`
    : `${sportConfig?.weekLabel ?? 'Week'} ${weekDoc.week}`;

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
          />
        </div>
      )}
    </div>
  );
};

export default Accordion;
