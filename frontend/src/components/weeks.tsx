import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../api/auth';
import { getEventGroupsBySportLeagueWithDates } from '../api/events';
import { getLeagueTeams } from '../api/leagues';
import { useLeague } from '../contexts/LeagueContext';
import type { EventOption } from '../sports/types';
import EventAccordion, { type EventGroupInfo } from './accordion';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorDisplay,
  LoadingSpinner,
  PageContainer,
  PageHeader,
} from './ui';

const Weeks: React.FC = () => {
  const { leagueId, season } = useParams<{ leagueId: string; season: string }>();
  const navigate = useNavigate();
  const { league, sportConfig, loading: leagueLoading, error: leagueError } = useLeague();

  const [eventGroups, setEventGroups] = useState<EventGroupInfo[]>([]);
  const [currentEventGroupId, setCurrentEventGroupId] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sportConfig) return;

      try {
        setError('');
        setLoading(true);

        const current = await getCurrentUser();
        const userId = current?.id || current?.userId;
        if (!current || !userId) {
          if (!cancelled) navigate('/');
          return;
        }

        const [teams, allEventGroups] = await Promise.all([
          getLeagueTeams(leagueId!),
          getEventGroupsBySportLeagueWithDates(sportConfig.key),
        ]);

        if (cancelled) return;

        const lookup = new Map(allEventGroups.map((eg) => [eg.eventGroupId, eg]));
        const eventGroupMap = new Map<string, EventGroupInfo>();

        if (Array.isArray(teams)) {
          teams
            .filter(
              (team: any) =>
                !season || (team.seasonYear && String(team.seasonYear) === String(season)),
            )
            .forEach((team: any) => {
              if (team.eventGroupId != null && !eventGroupMap.has(team.eventGroupId)) {
                const eg = lookup.get(team.eventGroupId);
                eventGroupMap.set(team.eventGroupId, {
                  eventGroupId: team.eventGroupId,
                  label: eg?.name ?? team.eventGroupName ?? team.eventGroupId,
                  startDate: eg?.startDate ?? null,
                  endDate: eg?.endDate ?? null,
                  status: eg?.status,
                });
              }
            });
        }

        const currentEventGroup = await sportConfig.fetchCurrentEventGroup();
        if (currentEventGroup != null) {
          if (!cancelled) setCurrentEventGroupId(currentEventGroup.eventGroupId);
          if (!eventGroupMap.has(currentEventGroup.eventGroupId)) {
            const eg = lookup.get(currentEventGroup.eventGroupId);
            eventGroupMap.set(currentEventGroup.eventGroupId, {
              eventGroupId: currentEventGroup.eventGroupId,
              label: currentEventGroup.label,
              startDate: eg?.startDate ?? null,
              endDate: eg?.endDate ?? null,
              status: eg?.status,
            });
          }
        }

        const available = allEventGroups.filter((eg) => !eventGroupMap.has(eg.eventGroupId));
        if (!cancelled) {
          setAvailableEvents(
            available.map((eg) => ({
              value: eg.eventGroupId,
              label: eg.name,
              startDate: eg.startDate,
              endDate: eg.endDate,
              status: eg.status,
            })),
          );
          setEventGroups(Array.from(eventGroupMap.values()));
        }
      } catch (err: any) {
        console.error('Failed to load event groups', err);
        if (!cancelled) setError(err?.message ?? 'Failed to load event groups');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (leagueId && season && sportConfig) {
      load();
    } else if (!leagueLoading) {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [leagueId, season, navigate, sportConfig, leagueLoading]);

  const handleAddEventGroup = (event: EventOption) => {
    setEventGroups((prev) => [...prev, { eventGroupId: event.value, ...event }]);
    setAvailableEvents((prev) => prev.filter((e) => e.value !== event.value));
  };

  const eventLabel = sportConfig?.eventLabel ?? 'Week';

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: league?.name || 'League', to: `/league/${leagueId}` },
    { label: `Season ${season}` },
  ];

  const isLoading = loading || leagueLoading;
  const displayError = error || leagueError;

  if (isLoading) {
    return (
      <PageContainer width="wide">
        <PageHeader title={`Season ${season}`} breadcrumbs={breadcrumbs} />
        <LoadingSpinner message={`Loading ${eventLabel.toLowerCase()}s...`} />
      </PageContainer>
    );
  }

  if (displayError) {
    return (
      <PageContainer width="wide">
        <PageHeader title={`Season ${season}`} breadcrumbs={breadcrumbs} />
        <ErrorDisplay message={displayError} />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        title={`Season ${season}`}
        description={`${eventLabel}s played in this league.`}
        breadcrumbs={breadcrumbs}
        meta={sportConfig && <Badge variant="brand">{sportConfig.displayName}</Badge>}
      />

      {eventGroups.length === 0 ? (
        <EmptyState
          title={`No ${eventLabel.toLowerCase()}s yet`}
          description={`Add one below to start tracking entries for this season.`}
        />
      ) : (
        <div className="space-y-3">
          {eventGroups.map((group, index) => (
            <EventAccordion
              key={group.eventGroupId}
              eventGroup={group}
              leagueId={leagueId!}
              season={season!}
              currentEventGroupId={currentEventGroupId}
              // Open the live event by default, or the first one if none is
              // live — otherwise the page is a wall of closed rows.
              defaultOpen={
                currentEventGroupId
                  ? group.eventGroupId === currentEventGroupId
                  : index === 0
              }
            />
          ))}
        </div>
      )}

      {availableEvents.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Available {eventLabel.toLowerCase()}s</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <p className="mb-3 text-sm text-text-muted">
              Add a {eventLabel.toLowerCase()} to this season to draft lineups for it.
            </p>
            {availableEvents.map((event) => (
              <div
                key={event.value}
                className="flex items-center justify-between gap-3 rounded border border-border bg-surface-sunken px-4 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium text-text">
                  {event.label}
                </span>
                <Button size="sm" variant="secondary" onClick={() => handleAddEventGroup(event)}>
                  Add
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </PageContainer>
  );
};

export default Weeks;
