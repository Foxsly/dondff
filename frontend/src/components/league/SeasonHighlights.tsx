import React, { useEffect, useState } from "react";
import { getCurrentUser } from "../../api/auth";
import { getLeagueUsers, getSeasonHighlights } from "../../api/leagues";
import { getUser } from "../../api/users";
import { useLeague } from "../../contexts/LeagueContext";
import { cn } from "../../lib/cn";
import type { SeasonHighlights as SeasonHighlightsData } from "../../types";
import { formatEventGroupTitle } from "../accordion";
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Skeleton,
  StatTile,
} from "../ui";

const formatPoints = (value: number | null | undefined): string =>
  value == null ? "—" : value.toFixed(2);

export interface SeasonHighlightsViewProps {
  highlights: SeasonHighlightsData;
  nameFor: (userId: string) => string;
  positionLabel: (position: string) => string;
  eventTitle: (eventGroupName: string) => string;
  currentUserId?: string;
}

/**
 * Season summary: best lineup, best score at each position, and a per-player
 * record. Everything is computed server-side; this only renders it.
 */
export const SeasonHighlightsView: React.FC<SeasonHighlightsViewProps> = ({
  highlights,
  nameFor,
  positionLabel,
  eventTitle,
  currentUserId,
}) => {
  const { topLineup, topByPosition, userStats } = highlights;

  return (
    <div className="space-y-5">
      {topLineup || topByPosition.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topLineup && (
            <div className="rounded border border-border bg-surface-sunken p-4 sm:col-span-2 lg:col-span-1">
              <StatTile
                label="Top lineup"
                value={formatPoints(topLineup.totalPoints)}
                tone="success"
                size="lg"
                hint={`${nameFor(topLineup.userId)} · ${eventTitle(topLineup.eventGroupName)}`}
              />
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                {topLineup.players.map((player) => (
                  <li
                    key={player.position}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0 truncate text-text">
                      <span className="mr-2 text-label uppercase text-text-subtle">
                        {positionLabel(player.position)}
                      </span>
                      {player.playerName}
                    </span>
                    <span className="tnum font-mono text-text-muted">
                      {formatPoints(player.actualPoints)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topByPosition.map((player) => (
            <div
              key={player.position}
              className="rounded border border-border bg-surface-sunken p-4"
            >
              <StatTile
                label={`Best ${positionLabel(player.position)}`}
                value={formatPoints(player.actualPoints)}
                tone="brand"
                hint={`${nameFor(player.userId)} · ${eventTitle(player.eventGroupName)}`}
              />
              <div className="mt-2 truncate text-sm font-medium text-text">
                {player.playerName}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          Scoring highlights appear once a week is final.
        </p>
      )}

      {userStats.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised text-left">
                <th
                  scope="col"
                  className="px-4 py-3 text-label uppercase text-text-subtle"
                >
                  Player
                </th>
                {["Played", "Wins", "Total", "Avg", "Best"].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="px-4 py-3 text-right text-label uppercase text-text-subtle"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userStats.map((stats) => {
                const isCurrentUser = stats.userId === currentUserId;
                return (
                  <tr
                    key={stats.userId}
                    className={cn(
                      "border-b border-border/50 last:border-b-0",
                      isCurrentUser
                        ? "bg-brand/5"
                        : "hover:bg-surface-raised/50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-text-strong">
                        {nameFor(stats.userId)}
                      </span>
                      {isCurrentUser && (
                        <span className="ml-1.5 text-label uppercase text-brand">
                          You
                        </span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-mono text-text-muted">
                      {stats.weeksPlayed}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-mono font-bold text-success">
                      {stats.wins}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-mono text-text-muted">
                      {formatPoints(stats.totalPoints)}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-mono text-text-muted">
                      {formatPoints(stats.averagePoints)}
                    </td>
                    <td className="tnum px-4 py-3 text-right font-mono text-text-muted">
                      {formatPoints(stats.bestScore)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export interface SeasonHighlightsProps {
  leagueId: string;
  season: string;
}

/**
 * Loads its own data so a slow or failed highlights request never holds up
 * the week list beside it.
 */
const SeasonHighlights: React.FC<SeasonHighlightsProps> = ({
  leagueId,
  season,
}) => {
  const { sportConfig } = useLeague();
  const [highlights, setHighlights] = useState<SeasonHighlightsData | null>(
    null,
  );
  const [names, setNames] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        setHighlights(null);

        const [data, members, current] = await Promise.all([
          getSeasonHighlights(leagueId, season),
          getLeagueUsers(leagueId),
          getCurrentUser().catch(() => null),
        ]);

        // Stats can include users who have since left the league.
        const userIds = Array.from(
          new Set([
            ...members.map((m) => m.userId),
            ...data.userStats.map((s) => s.userId),
          ]),
        );
        const users = await Promise.all(
          userIds.map((userId) => getUser(userId)),
        );

        if (cancelled) return;
        setNames(
          Object.fromEntries(
            users.map((user, index) => [
              userIds[index],
              user?.name || user?.email || "Unknown",
            ]),
          ),
        );
        setCurrentUserId(current?.userId || current?.id);
        setHighlights(data);
      } catch (err: any) {
        console.error("Failed to load season highlights", err);
        if (!cancelled)
          setError(err?.message ?? "Failed to load season highlights");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId, season]);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Season highlights</CardTitle>
      </CardHeader>
      <CardBody>
        {error ? (
          <Alert variant="danger">{error}</Alert>
        ) : !highlights ? (
          <div className="space-y-3" aria-busy="true">
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 rounded" />
              <Skeleton className="h-24 rounded" />
              <Skeleton className="h-24 rounded" />
            </div>
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <SeasonHighlightsView
            highlights={highlights}
            nameFor={(userId) => names[userId] ?? "Unknown"}
            positionLabel={(position) =>
              sportConfig?.getPositionDisplayName(position) ?? position
            }
            eventTitle={(name) =>
              formatEventGroupTitle(name, sportConfig?.eventLabel)
            }
            currentUserId={currentUserId}
          />
        )}
      </CardBody>
    </Card>
  );
};

export default SeasonHighlights;
