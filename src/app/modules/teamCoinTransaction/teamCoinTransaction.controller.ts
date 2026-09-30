import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { TeamCoinTransactionService } from "./teamCoinTransaction.service";

const getTeamCoinHistory = catchAsync(async (req, res) => {
  const teamId = req.params.teamId as string;
  const result = await TeamCoinTransactionService.getTeamCoinHistoryFromDB(
    teamId,
    req.query
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Team coin history retrieved successfully",
    data: result.data,
    pagination: result.meta,
  });
});

const getMyTeamCoinHistory = catchAsync(async (req, res) => {
  const managerId = ((req.user as any)?._id || (req.user as any)?.id) as string;
  const result = await TeamCoinTransactionService.getMyTeamCoinHistoryFromDB(
    managerId,
    req.query
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My team coin history retrieved successfully",
    data: result.data,
    pagination: result.meta,
  });
});

const adminAdjustTeamCoins = catchAsync(async (req, res) => {
  const adminId = ((req.user as any)?._id || (req.user as any)?.id) as string;
  const teamId = req.params.teamId as string;
  const result = await TeamCoinTransactionService.adminAdjustTeamCoinsInDB(
    adminId,
    teamId,
    req.body
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Team coins adjusted successfully",
    data: result,
  });
});

export const TeamCoinTransactionController = {
  getTeamCoinHistory,
  getMyTeamCoinHistory,
  adminAdjustTeamCoins,
};
