import {
  FanduelPlayerProjectionEntry,
  FanduelProjectionsResponse,
} from '@/fanduel/entities/fanduel.entity';
import {
  ISleeperPlayerEntry,
  ISleeperPlayerProjectionStats,
  SleeperProjectionResponse,
  SleeperStatResponse,
} from '@/sleeper/entities/sleeper.entity';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import typia from 'typia';

@Injectable()
export class FanduelService {
  private readonly BASE_URL = 'https://fdresearch-api.fanduel.com/graphql';

  // Create transformer functions
  private assertFanduelProjections = typia.misc.createAssertPrune<FanduelProjectionsResponse>();


  constructor(
    @Inject(HttpService)
    private readonly httpService: HttpService,
  ) {}

  async getFanduelProjections(): Promise<FanduelProjectionsResponse> {
    const requestBody = {
      query:
        'query GetProjections($input: ProjectionsInput!) {\n  getProjections(input: $input) {\n    ... on MlbPitcher {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      winsLosses\n      salary\n      value\n      wins\n      losses\n      earnedRunsAvg\n      gamesStarted\n      saves\n      inningsPitched\n      hits\n      runs\n      earnedRuns\n      homeRuns\n      walks\n      strikeouts\n      walksPlusHitsPerInningsPitched\n      gamesPlayed\n      fantasy\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n    }\n    ... on MlbBatter {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      salary\n      value\n      plateAppearances\n      runs\n      hits\n      singles\n      doubles\n      triples\n      homeRuns\n      runsBattedIn\n      stolenBases\n      caughtStealing\n      walks\n      strikeouts\n      battingAverage\n      onBasePercentage\n      sluggingPercentage\n      onBasePlusSlugging\n      fantasy\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n    }\n    ... on NflSkill {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n      salary\n      value\n      completionsAttempts\n      passingYards\n      passingTouchdowns\n      interceptionsThrown\n      rushingAttempts\n      rushingYards\n      rushingTouchdowns\n      receptions\n      targets\n      receivingYards\n      receivingTouchdowns\n      fantasy\n      positionRank\n      overallRank\n      opponentDefensiveRank\n    }\n    ... on NflKicker {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n      salary\n      value\n      extraPointsAttempted\n      extraPointsMade\n      fieldGoalsAttempted\n      fieldGoalsMade\n      fieldGoalsMade0To19\n      fieldGoalsMade20To29\n      fieldGoalsMade30To39\n      fieldGoalsMade40To49\n      fieldGoalsMade50Plus\n      fantasy\n      positionRank\n      opponentDefensiveRank\n    }\n    ... on NflDefenseSt {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n      salary\n      value\n      pointsAllowed\n      yardsAllowed\n      sacks\n      interceptions\n      fumblesRecovered\n      touchdowns\n      fantasy\n      positionRank\n      opponentOffensiveRank\n    }\n    ... on NflDefensePlayer {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n      tackles\n      sacks\n      interceptions\n      touchdowns\n      passesDefended\n      fumblesRecovered\n      opponentOffensiveRank\n    }\n    ... on NhlSkater {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      minutesPlayed\n      salary\n      value\n      shots\n      goals\n      assists\n      points\n      powerPlayGoals\n      powerPlayAssists\n      plusMinus\n      blockedShots\n      penaltiesInMinutes\n      fantasy\n      timeOnIce\n      avgTimeOnIce\n      gamesPlayed\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n    }\n    ... on NhlGoalie {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      minutesPlayed\n      salary\n      value\n      goalsAgainst\n      shotsAgainst\n      saves\n      shutouts\n      wins\n      losses\n      savePercent\n      timeOnIce\n      tiesPlusOvertimeOrShootoutLosses\n      fantasy\n      gamesPlayed\n      goalsAgainstAvg\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n    }\n    ... on NbaPlayer {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      team {\n        numberFireId\n        name\n        imageUrl\n        abbreviation\n      }\n      gameInfo {\n        homeTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        awayTeam {\n          numberFireId\n          name\n          imageUrl\n          abbreviation\n        }\n        gameTime\n      }\n      salary\n      value\n      minutes\n      fieldGoalsMade\n      fieldGoalsAttempted\n      threePointsMade\n      threePointsAttempted\n      freeThrowsMade\n      freeThrowsAttempted\n      assists\n      steals\n      blocks\n      turnovers\n      points\n      rebounds\n      gamesPlayed\n      fieldGoalShootingPercentage\n      threePointsShootingPercentage\n      freeThrowShootingPercentage\n      fantasy\n      positionRank\n      overallRank\n    }\n    ... on GolfPlayer {\n      player {\n        numberFireId\n        name\n        position\n        playerPageUrl\n        imageUrl\n        handedness\n      }\n      fantasy\n      salary\n      value\n      score\n      madeCut\n      first\n      topFive\n      topTen\n      topTwentyFive\n      eagles\n      birdies\n      pars\n      bogeys\n      doubleBogeys\n    }\n  }\n}',
      variables: {
        input: {
          type: 'PPR',
          position: 'NFL_SKILL',
          sport: 'NFL',
        },
      },
      operationName: 'GetProjections',
    };
    const response$ = this.httpService.post(`${this.BASE_URL}`, requestBody);
    const response = await lastValueFrom(response$);

    const projections = response.data.data.getProjections;
    const nonZeroScoringPlayers = projections.filter(
      (entry) => entry?.fantasy >= 0,
    );
    return this.assertFanduelProjections(
        nonZeroScoringPlayers
    );
  }

  /**
   * Generic transformer: raw JSON -> domain type with Dates and numbers
   */
  private transformFanduelEntries(raw: unknown[]): FanduelPlayerProjectionEntry[] {
    return raw.map((entry: any) => ({
      ...entry,
      season: Number(entry.season),
      date: new Date(entry.date),
      last_modified: new Date(entry.last_modified),
      updated_at: new Date(entry.updated_at),
    }));
  }

}
