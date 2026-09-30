import { Schema, model } from "mongoose";
import {
  TEAM_COIN_CATEGORY,
  ITeamCoinTransaction,
} from "./teamCoinTransaction.interface";

const teamCoinTransactionSchema = new Schema<ITeamCoinTransaction>(
  {
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["CREDIT", "DEBIT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: Object.values(TEAM_COIN_CATEGORY),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      default: null,
      index: true,
    },
    opponentTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    transferredPlayer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    transfer: {
      type: Schema.Types.ObjectId,
      ref: "Transfer",
      default: null,
      index: true,
    },
    referenceId: {
      type: String,
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

teamCoinTransactionSchema.index({ team: 1, createdAt: -1 });

export const TeamCoinTransaction = model<ITeamCoinTransaction>(
  "TeamCoinTransaction",
  teamCoinTransactionSchema
);
