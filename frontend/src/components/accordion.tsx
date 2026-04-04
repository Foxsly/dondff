import React, {useState} from "react";
import {useLeague} from "../contexts/LeagueContext";
import Entries from "./entries";

interface EventGroupInfo {
  eventGroupId: string;
  label: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface AccordionProps {
  eventGroup: EventGroupInfo;
  leagueId: string;
  season: string;
  currentEventGroupId: string | null;
}

const Accordion: React.FC<AccordionProps> = ({ eventGroup, leagueId, season, currentEventGroupId }) => {
  const [isActive, setIsActive] = useState(false);
  const { sportConfig } = useLeague();

  const title = sportConfig?.eventLabel === 'Event' && eventGroup.label
    ? `Event: ${eventGroup.label}`
    : `${sportConfig?.eventLabel ?? 'Week'} ${eventGroup.label}`;

  return (
    <div className="accordion-item">
      <div className="accordion-title" onClick={() => setIsActive(!isActive)}>
        <div>{title}</div>
        <div>{isActive ? '-' : '+'}</div>
      </div>
      {isActive && (
        <div className="accordion-content">
          <Entries
            leagueId={leagueId}
            season={season}
            eventGroupId={eventGroup.eventGroupId}
            currentEventGroupId={currentEventGroupId}
            startDate={eventGroup.startDate}
            endDate={eventGroup.endDate}
          />
        </div>
      )}
    </div>
  );
};

export default Accordion;
