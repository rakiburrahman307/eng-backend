import { Model, Types } from 'mongoose';

export type IPositionReward = {
  position: number;
  positionName: string;
  points: number; // Prize Money Coins
  rewardToken?: string;
};

export type IRedeemedPlayer = {
  player: Types.ObjectId;
  position: number;
  positionName: string;
  redeemedAt: Date;
  coins: number;
};

export type ITournament = {
  _id?: Types.ObjectId;
  title: string;
  description: string;
  banner?: string;
  startDate: Date;
  endDate: Date;
  positionRewards: IPositionReward[];
  rewardToken?: string;
  redeemedPlayers?: IRedeemedPlayer[];
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TournamentModel = Model<ITournament, Record<string, unknown>>;
