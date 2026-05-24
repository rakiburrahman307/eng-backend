import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PlayerDashboardService } from "./playerDashboard.service";

// GET PLAYER DASHBOARD
const getPlayerDashboard = catchAsync(async (req: Request, res: Response) => {
  const { playerId } = req.params as { playerId: string };

  const result = await PlayerDashboardService.getPlayerDashboardFromDB(
    playerId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Player dashboard retrieved successfully",
    data: result,
  });
});

export const PlayerDashboardController = {
  getPlayerDashboard,
};