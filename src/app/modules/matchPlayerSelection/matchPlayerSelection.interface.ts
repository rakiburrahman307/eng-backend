import { Types } from "mongoose";

export interface IPlayerSelection {
  player: Types.ObjectId;
  position: string;
  substitute: boolean;
}

export interface IMatchPlayerSelection {
  match: Types.ObjectId;
  team: Types.ObjectId;
  teamFormation: string;
  players: IPlayerSelection[];
  createdAt?: Date;
  updatedAt?: Date;
}