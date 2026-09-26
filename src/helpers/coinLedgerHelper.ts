import { Types, ClientSession } from "mongoose";
import { User } from "../app/modules/user/user.model";
import { PlayerEconomy } from "../app/modules/coinAndBudget/playerEconomySchema.model";
import { CoinTransaction } from "../app/modules/coinTransaction/coinTransaction.model";
import {
  COIN_TRANSACTION_CATEGORY,
  ICoinTransaction,
} from "../app/modules/coinTransaction/coinTransaction.interface";

export interface IRecordCoinTransactionParams {
  userId: string | Types.ObjectId;
  amount: number; // positive = credit, negative = debit
  category: COIN_TRANSACTION_CATEGORY;
  title: string;
  description?: string;
  matchId?: string | Types.ObjectId;
  referenceId?: string;
  createdBy?: string | Types.ObjectId;
  session?: ClientSession;
  syncMarketValue?: boolean;
}

export const recordCoinTransaction = async (
  params: IRecordCoinTransactionParams
): Promise<{ user: any; transaction: ICoinTransaction | null }> => {
  const {
    userId,
    amount,
    category,
    title,
    description = "",
    matchId,
    referenceId,
    createdBy,
    session,
    syncMarketValue = true,
  } = params;

  if (!userId || isNaN(Number(amount)) || Number(amount) === 0) {
    const user = await User.findById(userId).session(session || null);
    return { user, transaction: null };
  }

  const user = await User.findById(userId).session(session || null);
  if (!user) {
    throw new Error(`User not found for ID: ${userId}`);
  }

  const balanceBefore = Number(user.engCoine) || 0;
  const balanceAfter = Math.max(0, balanceBefore + Number(amount));

  user.engCoine = balanceAfter;

  if (syncMarketValue) {
    const pe = await PlayerEconomy.findOne().session(session || null);
    const rate = Number(pe?.conversionRate) || 100;
    const floorMV = Number(pe?.startingMarketValue) || 10000000;
    user.marketValue = Math.max(floorMV, balanceAfter * rate);
  }

  await user.save({ session: session || undefined });

  const transactionData: Partial<ICoinTransaction> = {
    user: user._id,
    type: amount >= 0 ? "CREDIT" : "DEBIT",
    amount: Math.abs(Number(amount)),
    balanceBefore,
    balanceAfter,
    category,
    title,
    description,
    match: matchId ? new Types.ObjectId(matchId.toString()) : undefined,
    referenceId: referenceId ? referenceId.toString() : undefined,
    createdBy: createdBy ? new Types.ObjectId(createdBy.toString()) : undefined,
  };

  const [transaction] = await CoinTransaction.create([transactionData], {
    session: session || undefined,
  });

  return { user, transaction };
};
