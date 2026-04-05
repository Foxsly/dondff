import React, {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {getCurrentUser} from "../api/auth";
import {getEventGroupsBySportLeagueWithDates} from "../api/events";
import {getLeagueTeams} from "../api/leagues";
import {useLeague} from "../contexts/LeagueContext";
import type {EventOption} from "../sports/types";
import Accordion from "./accordion";
import Breadcrumbs from "./breadcrumbs";
import ErrorDisplay from "./ui/ErrorDisplay";
import LoadingSpinner from "./ui/LoadingSpinner";

interface EventGroupInfo {
  eventGroupId: string;
  label: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

const Weeks: React.FC = () => {
  const { leagueId, season } = useParams<{ leagueId: string; season: string }>();
  const navigate = useNavigate();
  const { league, sportConfig, loading: leagueLoading, error: leagueError } = useLeague();

  const [eventGroups, setEventGroups] = useState<EventGroupInfo[]>([]);
  const [currentEventGroupId, setCurrentEventGroupId] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sportConfig) return;

      try {
        setError("");
        setLoading(true);

        const current = await getCurrentUser();
        if (!current) {
          if (!cancelled) navigate("/");
          return;
        }

        const userId = current.id || current.userId;
        if (!userId) {
          if (!cancelled) navigate("/");
          return;
        }

        const sport = sportConfig?.key;
        const [teams, allEventGroups] = await Promise.all([
          getLeagueTeams(leagueId!),
          getEventGroupsBySportLeagueWithDates(sport),
        ]);

        if (cancelled) return;

        // Build a lookup map from backend event groups (which include dates)
        const eventGroupLookup = new Map(
          allEventGroups.map((eg) => [eg.eventGroupId, eg]),
        );

        const eventGroupMap = new Map<string, EventGroupInfo>();

        if (Array.isArray(teams)) {
          const leagueTeams = teams.filter((team: any) => {
              return !season || (team.seasonYear && String(team.seasonYear) === String(season));
          });

          leagueTeams.forEach((team: any) => {
            if (team.eventGroupId != null && !eventGroupMap.has(team.eventGroupId)) {
              const eg = eventGroupLookup.get(team.eventGroupId);
              eventGroupMap.set(team.eventGroupId, {
                eventGroupId: team.eventGroupId,
                label: eg?.name ?? team.eventGroupName ?? team.eventGroupId,
                startDate: eg?.startDate ?? null,
                endDate: eg?.endDate ?? null,
              });
            }
          });
        }

        // Fetch current event group from sport config
        const currentEventGroup = await sportConfig.fetchCurrentEventGroup();
        if (currentEventGroup != null) {
          if (!cancelled) setCurrentEventGroupId(currentEventGroup.eventGroupId);
          if (!eventGroupMap.has(currentEventGroup.eventGroupId)) {
            const eg = eventGroupLookup.get(currentEventGroup.eventGroupId);
            eventGroupMap.set(currentEventGroup.eventGroupId, {
              eventGroupId: currentEventGroup.eventGroupId,
              label: currentEventGroup.label,
              startDate: eg?.startDate ?? null,
              endDate: eg?.endDate ?? null,
            });
          }
        }

        // Fetch available events (golf tournaments, etc.)
        const events = await sportConfig.fetchAvailableEventGroups(season!);
        if (!cancelled) setAvailableEvents(events);

        const derivedEventGroups = Array.from(eventGroupMap.values());
        if (!cancelled) setEventGroups(derivedEventGroups);
      } catch (err: any) {
        console.error("Failed to load event groups", err);
        if (!cancelled) setError(err?.message ?? "Failed to load event groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId && season && sportConfig) {
      load();
    } else if (!leagueLoading) {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [leagueId, season, navigate, sportConfig, leagueLoading]);

  const handleCreateEventGroup = async (event: EventOption) => {
    try {
      const sport = sportConfig?.key ?? 'NFL';
      const allEventGroups = await getEventGroupsBySportLeagueWithDates(sport);
      const matchingGroup = allEventGroups.find(eg => eg.name === event.label);
      
      if (matchingGroup) {
        const newGroup: EventGroupInfo = {
          eventGroupId: matchingGroup.eventGroupId,
          label: event.label,
          startDate: matchingGroup.startDate,
          endDate: matchingGroup.endDate,
        };
        setEventGroups((prev) => [...prev, newGroup]);
        setAvailableEvents((prev) => prev.filter((e) => e.value !== event.value));
      } else {
        setError(`Event group "${event.label}" not found after sync`);
      }
    } catch (err: any) {
      console.error("Failed to sync event groups", err);
      setError(err?.message ?? "Failed to sync event groups");
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", to: "/dashboard" },
    { label: league?.name || "League", to: `/league/${leagueId}` },
    { label: `Season ${season}` },
  ];

  const isLoading = loading || leagueLoading;
  const displayError = error || leagueError;

  if (isLoading) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={breadcrumbs} />
        <LoadingSpinner message="Loading event groups..." />
      </div>
    );
  }

  if (displayError) {
    return (
      <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
        <Breadcrumbs items={breadcrumbs} />
        <ErrorDisplay message={displayError} />
      </div>
    );
  }

  return (
    <div className="mx-auto p-4 space-y-4 text-left bg-[#3a465b]/50 rounded">
      <Breadcrumbs items={breadcrumbs} />
      <div className="space-y-4 max-w-[90%] mx-auto">
        {eventGroups.map((group) => (
          <Accordion
            key={group.eventGroupId}
            eventGroup={group}
            leagueId={leagueId!}
            season={season!}
            currentEventGroupId={currentEventGroupId}
          />
        ))}
      </div>
      {availableEvents.length > 0 && (
        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Available {sportConfig?.eventLabel}s
          </h3>
          {availableEvents.map((event) => (
            <button
              key={event.value}
              onClick={() => handleCreateEventGroup(event)}
              className="w-full text-left px-4 py-3 rounded bg-[#2a3447] hover:bg-[#344054] border border-[#3a465b] transition-colors"
            >
              <span className="text-white font-medium">{event.label}</span>
              <span className="text-gray-400 text-sm ml-2">— Create {sportConfig?.eventLabel?.toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Weeks;
