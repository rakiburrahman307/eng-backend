import { Types } from 'mongoose';

export interface IManagerTeam {
  manager: Types.ObjectId;
  team: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}