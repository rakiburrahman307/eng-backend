import { Types } from "mongoose";

export enum COIN_TRANSACTION_CATEGORY {
  GOAL = "GOAL",
  ASSIST = "ASSIST",
  CLEAN_SHEET = "CLEAN_SHEET",
  PLAYER_OF_THE_DAY = "PLAYER_OF_THE_DAY",
  MATCH_RATING = "MATCH_RATING",
  ATTEND_MATCH = "ATTEND_MATCH",
  WIN_MATCH = "WIN_MATCH",
  DRAW_MATCH = "DRAW_MATCH",
  RED_CARD_PENALTY = "RED_CARD_PENALTY",
  SUBSCRIPTION_BONUS = "SUBSCRIPTION_BONUS",
  PRODUCT_PURCHASE = "PRODUCT_PURCHASE",
  ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT",
  ROLLBACK = "ROLLBACK",
}

export type ICoinTransactionType = "CREDIT" | "DEBIT";

export interface ICoinTransaction {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  type: ICoinTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  category: COIN_TRANSACTION_CATEGORY;
  title: string;
  description?: string;
  match?: Types.ObjectId;
  referenceId?: string;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}
