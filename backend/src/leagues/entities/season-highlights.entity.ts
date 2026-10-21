import { tags } from 'typia';
import { ITeam } from '@/teams/entities/team.entity';
import { ITeamPlayer } from '@/teams/entities/team-player.entity';

/**
 * Read-only season summary for a league. Built only from teams in FINISHED
 * event groups whose lineups are fully scored, so nothing here is visible
 * earlier than it already is through GET /leagues/:id/teams.
 */
export interface ISeasonHighlights {
  seasonYear: number;
  /** Event groups in this season that have finished. */
  finishedEventGroups: number & tags.Minimum<0>;
  /** Highest fully-scored lineup of the season, or null before any week is scored. */
  topLineup: ISeasonLineupHighlight | null;
  /** Best single-player score per league position; positions with no score are omitted. */
  topByPosition: ISeasonPlayerHighlight[];
  /** One row per league member (and any other user with a team this season). */
  userStats: ISeasonUserStats[];
}

interface ISeasonEventGroupRef {
  eventGroupId: string & tags.Format<'uuid'>;
  eventGroupName: string;
}

export interface ISeasonLineupHighlight
  extends Pick<ITeam, 'teamId' | 'userId'>,
    ISeasonEventGroupRef {
  totalPoints: number;
  players: Pick<ITeamPlayer, 'position' | 'playerId' | 'playerName' | 'actualPoints'>[];
}

export interface ISeasonPlayerHighlight
  extends Pick<ITeamPlayer, 'position' | 'playerId' | 'playerName'>,
    Pick<ITeam, 'userId'>,
    ISeasonEventGroupRef {
  actualPoints: number;
}

export interface ISeasonUserStats extends Pick<ITeam, 'userId'> {
  /** Weeks with a complete lineup, whatever their status. */
  weeksPlayed: number & tags.Minimum<0>;
  /** Finished weeks where this user had (or tied for) the top score. */
  wins: number & tags.Minimum<0>;
  /** Sum of fully-scored lineups. */
  totalPoints: number;
  /** Mean of fully-scored lineups; null when none are scored yet. */
  averagePoints: number | null;
  bestScore: number | null;
}
