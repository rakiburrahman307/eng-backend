import { Types } from "mongoose";

export interface IStatsAuditLog {
  _id?: Types.ObjectId;
  player: Types.ObjectId;
  modifiedBy: Types.ObjectId;
  field: string;
  previousValue: number;
  newValue: number;
  reason: string;
  createdAt?: Date;
  updatedAt?: Date;
}
