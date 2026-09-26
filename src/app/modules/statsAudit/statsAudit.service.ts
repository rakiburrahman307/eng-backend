import mongoose from "mongoose";
import { StatsAuditLog } from "./statsAudit.model";
import { PlayerStats } from "../playerStats/playerStats.model";
import { User } from "../user/user.model";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";

const adminEditPlayerStatsInDB = async (
  adminId: string,
  playerId: string,
  payload: {
    goals?: number;
    assists?: number;
    cleanSheets?: number;
    yellowCards?: number;
    redCards?: number;
    playerOfTheDay?: number;
    matchesPlayed?: number;
    reason: string;
  }
) => {
  const { reason, ...statsPayload } = payload;

  if (!reason || reason.trim().length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "A reason note is required for editing player stats");
  }

  const player = await User.findById(playerId);
  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  // Find or create PlayerStats document for this player
  let statsDoc = await PlayerStats.findOne({ player: player._id });
  if (!statsDoc) {
    statsDoc = new PlayerStats({
      player: player._id,
      team: player.selectTeam || new mongoose.Types.ObjectId(),
      league: new mongoose.Types.ObjectId(),
    });
  }

  const allowedFields = [
    "goals",
    "assists",
    "cleanSheets",
    "yellowCards",
    "redCards",
    "playerOfTheDay",
    "matchesPlayed",
  ];

  const createdLogs: any[] = [];

  for (const field of allowedFields) {
    if ((statsPayload as any)[field] !== undefined) {
      const newVal = Math.max(0, Number((statsPayload as any)[field]) || 0);
      const prevVal = Number((statsDoc as any)[field]) || 0;

      if (newVal !== prevVal) {
        (statsDoc as any)[field] = newVal;

        const log = await StatsAuditLog.create({
          player: player._id,
          modifiedBy: new mongoose.Types.ObjectId(adminId),
          field,
          previousValue: prevVal,
          newValue: newVal,
          reason: reason.trim(),
        });
        createdLogs.push(log);
      }
    }
  }

  await statsDoc.save();

  return {
    stats: statsDoc,
    auditLogs: createdLogs,
  };
};

const getPlayerStatsAuditLogsFromDB = async (
  playerId: string,
  query: Record<string, any>
) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { player: new mongoose.Types.ObjectId(playerId) };

  const [logs, total] = await Promise.all([
    StatsAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("modifiedBy", "firstName lastName email role")
      .lean(),
    StatsAuditLog.countDocuments(filter),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: logs,
  };
};

export const StatsAuditService = {
  adminEditPlayerStatsInDB,
  getPlayerStatsAuditLogsFromDB,
};
