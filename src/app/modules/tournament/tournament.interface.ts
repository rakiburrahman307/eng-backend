import { Model, Types } from 'mongoose';

export type IPositionReward = {
  position: number;
  positionName: string;
  points: number;
};

export type ITournament = {
  _id?: Types.ObjectId;
  title: string;
  description: string;
  banner?: string;
  startDate: Date;
  endDate: Date;
  positionRewards: IPositionReward[];
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TournamentModel = Model<ITournament, Record<string, unknown>>;
