import { Types } from "mongoose";

export interface IMatchPlayerSelection {
  match: Types.ObjectId;
  team: Types.ObjectId;
  player: Types.ObjectId;
  position: string;
  createdAt?: Date;
  updatedAt?: Date;
}