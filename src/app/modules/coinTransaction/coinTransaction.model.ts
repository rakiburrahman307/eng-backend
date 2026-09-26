import { Schema, model } from "mongoose";
import {
  COIN_TRANSACTION_CATEGORY,
  ICoinTransaction,
} from "./coinTransaction.interface";

const coinTransactionSchema = new Schema<ICoinTransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      enum: Object.values(COIN_TRANSACTION_CATEGORY),
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

coinTransactionSchema.index({ user: 1, createdAt: -1 });

export const CoinTransaction = model<ICoinTransaction>(
  "CoinTransaction",
  coinTransactionSchema
);
