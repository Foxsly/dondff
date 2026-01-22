import React, { useState } from "react";
import Entries from "./entries";

const Accordion = ({ weekDoc, leagueId, season, actualWeek }) => {
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
