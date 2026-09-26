import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { StatsAuditService } from "./statsAudit.service";

const adminEditPlayerStats = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req.user as any)?._id || (req.user as any)?.id;
  const playerId = req.params.playerId as string;

  const result = await StatsAuditService.adminEditPlayerStatsInDB(
    adminId,
    playerId,
    req.body
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Player stats updated successfully",
    data: result,
  });
});

const getPlayerStatsAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const playerId = req.params.playerId as string;
  const result = await StatsAuditService.getPlayerStatsAuditLogsFromDB(
    playerId,
    req.query
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Player stats audit logs retrieved successfully",
    data: result,
  });
});

export const StatsAuditController = {
  adminEditPlayerStats,
  getPlayerStatsAuditLogs,
};
