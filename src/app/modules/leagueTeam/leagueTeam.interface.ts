import { Types } from 'mongoose';

export interface ILeagueTeam {
  league: Types.ObjectId;

  team: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}