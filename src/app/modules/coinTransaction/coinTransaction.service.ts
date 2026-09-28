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

  // Category filter: case-insensitive, alias support (e.g., 'goal', 'clean_sheet', 'yellow_card', or comma-separated 'goal,assist')
  if (query.category) {
    const rawCat = String(query.category).trim();
    if (rawCat) {
      const catList = rawCat.split(",").map((c) => c.trim()).filter(Boolean);
      const regexPatterns = catList.map((cat) => {
        const pattern = cat.replace(/[-_ ]+/g, ".*");
        return new RegExp(`^.*${pattern}.*$`, "i");
      });
      filter.category = regexPatterns.length === 1 ? regexPatterns[0] : { $in: regexPatterns };
    }
  }

  // Type filter: CREDIT or DEBIT (case-insensitive)
  if (query.type) {
    const typeUpper = String(query.type).trim().toUpperCase();
    if (typeUpper === "CREDIT" || typeUpper === "DEBIT") {
      filter.type = typeUpper;
    }
  }

  // Search filter
  if (query.searchTerm || query.search) {
    const searchStr = String(query.searchTerm || query.search).trim();
    if (searchStr) {
      filter.$or = [
        { title: { $regex: searchStr, $options: "i" } },
        { description: { $regex: searchStr, $options: "i" } },
      ];
    }
  }

  const [transactions, total] = await Promise.all([
    CoinTransaction.find(filter)
      .select("_id title type amount balanceAfter category createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
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
