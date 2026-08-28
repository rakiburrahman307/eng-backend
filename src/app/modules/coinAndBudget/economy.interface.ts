import { Model } from "mongoose";

export interface IEconomyValue {
  coin: number;
  marketValue?: number;
  budgetValue?: number;
}

export interface IPlayerEconomy {
  startingMarketValue: number;
  conversionRate: number;

  playingMatch: IEconomyValue;
  goal: IEconomyValue;
  assist: IEconomyValue;
  cleanSheet: IEconomyValue;

  goodRating: IEconomyValue;
  greatRating: IEconomyValue;
  eliteRating: IEconomyValue;

  playerOfTheDay: IEconomyValue;

  yellowCard: IEconomyValue;
  sinBin: IEconomyValue;
  redCard: IEconomyValue;
  disrespectToReferee: IEconomyValue;
  grossMisconduct: IEconomyValue;
  foul?: IEconomyValue;
}

export interface IClubEconomy {
  startingBudget: number;
  conversionRate: number;

  attendMatch: IEconomyValue;
  drawMatch: IEconomyValue;
  winMatch: IEconomyValue;

  exceptionalConduct: IEconomyValue;
  goodConduct: IEconomyValue;
  satisfactoryConduct: IEconomyValue;
  averageConduct: IEconomyValue;
  poorConduct: IEconomyValue;
  unprofessionalConduct: IEconomyValue;
}

export type PlayerEconomyModel = Model<IPlayerEconomy>;
export type ClubEconomyModel = Model<IClubEconomy>;