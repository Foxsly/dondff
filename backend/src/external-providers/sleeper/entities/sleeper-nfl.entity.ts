import { ISleeperPlayer, ISleeperPlayerEntry, ISleeperPlayerMetadata } from './sleeper.entity';

export type NflPosition = 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'K' | 'DEF' | 'DB';

export interface ISleeperNflPlayer extends ISleeperPlayer {
  fantasy_positions: NflPosition[];
  position: NflPosition;
}

export interface ISleeperNflPlayerMetadata extends ISleeperPlayerMetadata {
  genius_id: string;
}

export interface INflStats {
  pts_std: number;
  pts_half_ppr: number;
  pts_ppr: number;
}

export interface ISleeperNflPlayerEntry<TStats>
  extends Omit<ISleeperPlayerEntry<TStats>, 'player' | 'sport'> {
  player: ISleeperNflPlayer;
  sport: 'nfl';
}

//TODO determine if we should collapse these into a single SleeperNflStatResponse
export type SleeperNflStatResponse = ISleeperNflPlayerEntry<INflStats>[];
export type SleeperNflProjectionResponse = ISleeperNflPlayerEntry<INflStats>[];

export type SleeperNflStatRequest = {
  position: NflPosition;
};