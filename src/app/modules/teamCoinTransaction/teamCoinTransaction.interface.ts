import { Types } from "mongoose";

export enum TEAM_COIN_CATEGORY {
  ATTEND_MATCH = "ATTEND_MATCH",
  WIN_MATCH = "WIN_MATCH",
  DRAW_MATCH = "DRAW_MATCH",
  CONDUCT_RATING = "CONDUCT_RATING",
  PLAYER_TRANSFER_BUY = "PLAYER_TRANSFER_BUY",
  PLAYER_TRANSFER_SELL = "PLAYER_TRANSFER_SELL",
  ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT",
  TOURNAMENT_PRIZE = "TOURNAMENT_PRIZE",
  ROLLBACK = "ROLLBACK",
  OTHER = "OTHER",
}

export type ITeamCoinTransactionType = "CREDIT" | "DEBIT";

export interface ITeamCoinTransaction {
  _id?: Types.ObjectId;
  team: Types.ObjectId;
  type: ITeamCoinTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  category: TEAM_COIN_CATEGORY;
  title: string;
  description?: string;
  match?: Types.ObjectId;
  opponentTeam?: Types.ObjectId;
  transferredPlayer?: Types.ObjectId;
  transfer?: Types.ObjectId;
  referenceId?: string;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
