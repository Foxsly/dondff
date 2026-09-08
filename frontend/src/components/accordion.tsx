import React from 'react';
import { useLeague } from '../contexts/LeagueContext';
import Entries from './entries';
import { Accordion as AccordionPrimitive, Badge } from './ui';

export interface EventGroupInfo {
  eventGroupId: string;
  label: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: 'PENDING' | 'PLAYING' | 'FINISHED';
}

interface AccordionProps {
  eventGroup: EventGroupInfo;
  leagueId: string;
  season: string;
  currentEventGroupId: string | null;
  defaultOpen?: boolean;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'info' | 'warn' | 'success' }> = {
  PENDING: { label: 'Upcoming', variant: 'info' },
  PLAYING: { label: 'In progress', variant: 'warn' },
  FINISHED: { label: 'Final', variant: 'success' },
};

/** "12 Oct – 15 Oct", or a single date when both ends fall on the same day. */
const formatDateRange = (
  start?: string | Date | null,
  end?: string | Date | null,
): string | null => {
  if (!start) return null;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = startDate.toLocaleDateString(undefined, options);

  if (!end) return startLabel;

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;

  const endLabel = endDate.toLocaleDateString(undefined, options);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

const EventAccordion: React.FC<AccordionProps> = ({
  eventGroup,
  leagueId,
  season,
  currentEventGroupId,
  defaultOpen,
}) => {
  const { sportConfig } = useLeague();

  // NFL weeks are bare numbers ("3") and need the "Week" prefix to read as
  // anything; golf and World Cup events already carry a full name ("The Open",
  // "World Cup Group Stage – Matchday 1") and must not get one.
  //
  // Keyed off the shape of the label rather than the sport: the old check was
  // `eventLabel === 'Event'`, which covered golf but left World Cup rendering
  // as "Round World Cup Group Stage – Matchday 1".
  const isNumericLabel = /^\d+$/.test(String(eventGroup.label).trim());
  const title = isNumericLabel
    ? `${sportConfig?.eventLabel ?? 'Week'} ${eventGroup.label}`
    : eventGroup.label;

  const status = eventGroup.status ? STATUS_BADGE[eventGroup.status] : undefined;
  const dateRange = formatDateRange(eventGroup.startDate, eventGroup.endDate);

  return (
    <AccordionPrimitive
      defaultOpen={defaultOpen}
      title={title}
      meta={
        <>
          {dateRange && (
            <span className="hidden text-sm text-text-subtle sm:inline">{dateRange}</span>
          )}
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </>
      }
    >
      <Entries
        leagueId={leagueId}
        season={season}
        eventGroupId={eventGroup.eventGroupId}
        currentEventGroupId={currentEventGroupId}
        startDate={eventGroup.startDate}
        endDate={eventGroup.endDate}
        status={eventGroup.status}
      />
    </AccordionPrimitive>
  );
};

export default EventAccordion;
