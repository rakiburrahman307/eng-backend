import mongoose from "mongoose";
import { CoinTransaction } from "./coinTransaction.model";
import { User } from "../user/user.model";
import { COIN_TRANSACTION_CATEGORY } from "./coinTransaction.interface";
import { recordCoinTransaction } from "../../../helpers/coinLedgerHelper";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";

const getMyCoinHistoryFromDB = async (
  userId: string,
  query: Record<string, any>
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: any = { user: new mongoose.Types.ObjectId(userId) };

  if (query.category && Object.values(COIN_TRANSACTION_CATEGORY).includes(query.category)) {
    filter.category = query.category;
  }
  if (query.type && (query.type === "CREDIT" || query.type === "DEBIT")) {
    filter.type = query.type;
  }

  const [transactions, total, user] = await Promise.all([
    CoinTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("match", "homeTeam awayTeam homeScore awayScore matchDate")
      .lean(),
    CoinTransaction.countDocuments(filter),
    User.findById(userId).select("engCoine marketValue firstName lastName role").lean(),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    currentBalance: user?.engCoine || 0,
    marketValue: user?.marketValue || 0,
    data: transactions,
  };
};

const getPlayerCoinHistoryForAdminFromDB = async (
  playerId: string,
  query: Record<string, any>
) => {
  return await getMyCoinHistoryFromDB(playerId, query);
};

const adminAdjustCoinsInDB = async (
  adminId: string,
  playerId: string,
  payload: {
    amount: number;
    reason: string;
    title?: string;
  }
) => {
  const { amount, reason, title = "Admin Adjustment" } = payload;

  if (amount === undefined || isNaN(Number(amount)) || Number(amount) === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A non-zero numeric amount is required");
  }

  if (!reason || reason.trim().length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A reason note is required for admin coin adjustments");
  }

  const player = await User.findById(playerId);
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  const result = await recordCoinTransaction({
    userId: player._id,
    amount: Number(amount),
    category: COIN_TRANSACTION_CATEGORY.ADMIN_ADJUSTMENT,
    title,
    description: reason.trim(),
    createdBy: adminId,
  });

  return result;
};

export const CoinTransactionService = {
  getMyCoinHistoryFromDB,
  getPlayerCoinHistoryForAdminFromDB,
  adminAdjustCoinsInDB,
};
