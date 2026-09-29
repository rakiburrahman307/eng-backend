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

  const [transactions, total, userDoc] = await Promise.all([
    CoinTransaction.find(filter)
      .select("_id title type amount balanceBefore balanceAfter category description match createdAt")
      .populate({
        path: "match",
        select: "homeTeam awayTeam matchDate venueName matchType",
        populate: [
          { path: "homeTeam", select: "teamName shortName teamLogo" },
          { path: "awayTeam", select: "teamName shortName teamLogo" },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(filter),
    User.findById(userId).select("selectTeam").lean(),
  ]);

  const userTeamId = userDoc?.selectTeam ? (userDoc.selectTeam._id || userDoc.selectTeam).toString() : "";

  const enrichedData = transactions.map((tx: any) => {
    let opponentTeam: any = null;
    let fixture: string | null = null;

    if (tx.match && typeof tx.match === "object") {
      const home = tx.match.homeTeam;
      const away = tx.match.awayTeam;
      const homeName = home?.teamName || home?.shortName || "Home Team";
      const awayName = away?.teamName || away?.shortName || "Away Team";
      fixture = `${homeName} vs ${awayName}`;

      const homeId = home?._id ? home._id.toString() : (home?.toString() || "");
      const awayId = away?._id ? away._id.toString() : (away?.toString() || "");

      if (userTeamId) {
        if (userTeamId === homeId) {
          opponentTeam = away;
        } else if (userTeamId === awayId) {
          opponentTeam = home;
        }
      }
      if (!opponentTeam) {
        opponentTeam = away || home || null;
      }

      // If description doesn't already indicate the opponent, dynamically append it
      const oppName = opponentTeam?.teamName || opponentTeam?.shortName;
      if (
        oppName &&
        tx.description &&
        !tx.description.toLowerCase().includes(" vs ") &&
        !tx.description.toLowerCase().includes(oppName.toLowerCase())
      ) {
        tx.description = `${tx.description} vs ${oppName}`;
      }
    }

    return {
      ...tx,
      opponentTeam: opponentTeam
        ? {
            _id: opponentTeam._id,
            teamName: opponentTeam.teamName,
            shortName: opponentTeam.shortName,
            teamLogo: opponentTeam.teamLogo,
          }
        : null,
      fixture,
    };
  });

  const totalPage = Math.ceil(total / limit) || 1;

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    data: enrichedData,
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
