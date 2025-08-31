import { SetStateAction } from "react";

  export const getPlayers = async (week: string, position: string, seasonYear: string, playerLimit: string | number, callback: { (value: SetStateAction<never[]>): void; (value: SetStateAction<never[]>): void; (arg0: { name: string; points: any; status: any; opponent: any; team: any; playerId: any; }[]): void; }) => {
    console.log("calling getPlayers with " + week + " " + position + " " + seasonYear + " " + playerLimit)
    let players: ({ name: string; points: any; status: any; opponent: any; team: any; playerId: any; })[] = new Array();
    try {
      const url = `https://api.sleeper.com/projections/nfl/${seasonYear}/${week}?season_type=regular&position=${position}&order_by=pts_ppr`
      const response = await fetch(url)
      const json = await response.json()
// @ts-expect-error -- TODO: Operator '<' cannot be applied to types 'number' and 'string | number'.
      for (let i = 0; i < playerLimit; i++) {
        let playerJson = json[i];
        let player = {
            "name": `${playerJson.player.first_name} ${playerJson.player.last_name}`,
            "points": playerJson.stats.pts_ppr,
            "status": playerJson.player.injury_status, 
            "opponent": playerJson.opponent, 
            "team": playerJson.team, 
            "playerId": playerJson.player_id
        };
        players.push(player);
      }
      console.log(players);
      callback(players);
    } catch (error) {
      console.log(error)
    }
  }

  export const generateCases = (poolArray: string | any[], numberOfCasesToChoose: number) => {
    var result = new Array(numberOfCasesToChoose),
        numberOfPlayersRemainingInPool = poolArray.length,
        taken = new Array(poolArray.length);
    if (numberOfCasesToChoose > poolArray.length)
        throw new RangeError("getRandom: trying to choose more cases than exist in the pool");
    while (numberOfCasesToChoose--) {
        var x = Math.floor(Math.random() * numberOfPlayersRemainingInPool);
        result[numberOfCasesToChoose] = poolArray[x in taken ? taken[x] : x];
        taken[x] = --numberOfPlayersRemainingInPool in taken ? taken[numberOfPlayersRemainingInPool] : numberOfPlayersRemainingInPool;
    }
    return result.map((player, index) => {
      return {
        "number" : index + 1,
        "name" : player.name,
        "points" : player.points,
        "opened" : false,
        "status" : player.status,
        "opponent" : player.opponent,
        "team" : player.team,
        "playerId" : player.playerId
      }
    })
  }