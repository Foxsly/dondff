import { ISleeperPlayer, ISleeperPlayerEntry, ISleeperPlayerMetadata } from './sleeper.entity';

export type NbaPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface ISleeperNbaPlayer extends ISleeperPlayer {
  fantasy_positions: NbaPosition[];
  position: NbaPosition;
}

export interface ISleeperNbaPlayerMetadata extends ISleeperPlayerMetadata {
  channel_id: string;
}

export interface INbaStats {
  ast: number;
  blk: number;
  dd: number;
  dreb: number;
  fga: number;
  fgm: number;
  fgmi: number;
  fta: number;
  ftm: number;
  ftmi: number;
  gp: number;
  pts: number;
  reb: number;
  sp: number;
  stl: number;
  td: number;
  to: number;
  tpa: number;
  tpm: number;
  tpmi: number;
  fantasy_points: number;
}

export interface ISleeperNbaPlayerEntry<TStats>
  extends Omit<ISleeperPlayerEntry<TStats>, 'player' | 'sport'> {
  player: ISleeperNbaPlayer;
  sport: 'nba';
  opponent: string;
}

//TODO determine if we should collapse these into a single SleeperNbaStatResponse
export type SleeperNbaStatResponse = ISleeperNbaPlayerEntry<INbaStats>[];
export type SleeperNbaProjectionResponse = ISleeperNbaPlayerEntry<INbaStats>[];

export type SleeperNbaStatRequest = {
  position: NbaPosition;
};