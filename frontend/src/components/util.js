const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

export const getPlayers = async (week, position, seasonYear, playerLimit, callback) => {
    console.log("calling getPlayers with " + week + " " + position + " " + seasonYear + " " + playerLimit)
    let players = [];
    try {
      const url = `${API_BASE}/players/projections/${seasonYear}/${week}/${position}`
      const response = await fetch(url)
      const json = await response.json()
      for (let i = 0; i < playerLimit; i++) {
        let playerJson = json[i];
        if(!playerJson) {continue}
        let player = {
            "name": playerJson.name,
            "points": playerJson.projectedPoints,
            "status": playerJson.injuryStatus,
            "opponent": playerJson.oppTeam,
            "team": playerJson.team, 
            "playerId": playerJson.playerId
        };
        players.push(player);
      }
      console.log(players);
      callback(players);
    } catch (error) {
      console.log(error)
    }
  }

  export const generateCases = (poolArray, numberOfCasesToChoose) => {
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