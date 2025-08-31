import React, { useState } from "react";
import Entries from "./entries";

interface AccordionProps {
key: any;
// @ts-expect-error -- TODO: Cannot find name 'DocumentData'. Did you mean 'Document'?
weekDoc: DocumentData;
leagueId: string | undefined;
season: string | undefined;
actualWeek: null;
}

const Accordion = ({ weekDoc, leagueId, season, actualWeek }: AccordionProps) => {
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
