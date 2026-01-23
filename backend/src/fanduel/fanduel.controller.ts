import { FanduelNflProjectionsResponse } from '@/fanduel/entities/fanduel-nfl.entity';
import { FanduelSport } from '@/fanduel/entities/fanduel.entity';
import { PlayerPosition } from '@/player-stats/entities/player-stats.entity';
import { TypedParam, TypedRoute } from '@nestia/core';
import { Controller, Query } from '@nestjs/common';
import { FanduelService } from './fanduel.service';

const shuffle = (v, r = [...v]) => v.map(() => r.splice(~~(Math.random() * r.length), 1)[0]);

@Controller('fanduel')
export class FanduelController {
  constructor(private readonly fanduelService: FanduelService) {}

  @TypedRoute.Get('GOLF/events')
  getGolfEvents() {
    return this.fanduelService.getGolfEvents();
  }

  @TypedRoute.Get('GOLF/slates')
  getGolfSlates() {
    return this.fanduelService.getGolfSlates();
  }

  @TypedRoute.Get(':sport/projections')
  async getProjectionsBySport(
    @TypedParam('sport') sport: FanduelSport,
    @Query('eventId') eventId: string,
    @Query('slateId') slateId: string,
  ) {
    if (sport === 'NFL') {
      return this.fanduelService.getNflProjections();
    } else if (sport === 'GOLF') {
      return this.fanduelService.getGolfProjections(eventId, slateId);
    } else {
      throw new Error('No such sport');
    }
  }

  @TypedRoute.Get('GOLF/offer')
  async getRandomOffer(@Query('loops') loops: number) {
    let fanduelGolfProjectionEntries = (await this.fanduelService.getGolfProjections()).map((entry) => ({
      ...entry,
      salary: Number(entry.salary.replace("$", "")),
    }));

    let offerMap = new Map();

    for(let x=0; x < loops; x++) {
      let entries = shuffle(fanduelGolfProjectionEntries).slice(0,10);

      const finalOfferValue = Math.sqrt(
        entries.map((a) => a.salary ** 2).reduce((sum, v) => sum + v, 0) / 9,
      );

      const playerIdsInBoxes = entries.map(entry => entry.player.numberFireId)
      const closestOffer = shuffle(fanduelGolfProjectionEntries.filter(e => !playerIdsInBoxes.includes(e.player.numberFireId)))
        .reduce((closest, current) => {
        const currentDiff = Math.abs(current.salary - finalOfferValue);
        const closestDiff = Math.abs(closest.salary - finalOfferValue);
        return currentDiff < closestDiff ? current : closest;
      });

      // Count the player that would be chosen from the closestOffer
      // const closestPlayer = {
      //   id: closestOffer.player.numberFireId,
      //   name: closestOffer.player.name,
      //   salary: closestOffer.salary,
      // }
      const closestPlayer = `${closestOffer.player.numberFireId}|${closestOffer.salary}`;
      // const closestPlayer = closestOffer.salary;
      if (offerMap.has(closestPlayer)) {
        offerMap.set(closestPlayer, offerMap.get(closestPlayer) + 1);
      } else {
        offerMap.set(closestPlayer, 1);
      }
    }

    return {
      // selectedGolfer: chosen,
      // offerValue: finalOfferValue,
      // closestOffer: closestOffer,
      numPlayerOffers: offerMap.size,
      offerMap: Object.fromEntries(offerMap),
      totalPlayers: fanduelGolfProjectionEntries.length,
      // offerMap: Object.fromEntries(offerMap),
      // allSalaries: fanduelGolfProjectionEntries.map((entry) => ({
      //   salary: entry.salary,
      // }))
    }
  }

  @TypedRoute.Get('test')
  async getPositionStats() {
    const fP: FanduelNflProjectionsResponse = await this.fanduelService.getNflProjections();
    let stats: PositionStats[] = [{ position: 'RB' }, { position: 'WR' }, { position: 'TE' }];
    stats.forEach((value) => {
      let fPP = fP.filter((e) => e.player.position === value.position);
      console.log(value.position, fPP.length);
      value.overTen = fPP.filter((e) => e.fantasy >= 10.0).length;
      value.fiveToTen = fPP.filter((e) => e.fantasy >= 5.0 && e.fantasy < 10.0).length;
      value.twoToFive = fPP.filter((e) => e.fantasy >= 2.0 && e.fantasy < 5.0).length;
      value.oneToTwo = fPP.filter((e) => e.fantasy >= 1.0 && e.fantasy < 2.0).length;
      value.underOne = fPP.filter((e) => e.fantasy > 0.0 && e.fantasy < 1.0).length;
    });
    return stats;
  }
}

interface PositionStats {
  position: PlayerPosition,
  overTen?: number,
  fiveToTen?: number,
  twoToFive?: number
  oneToTwo?: number,
  underOne?: number
}
