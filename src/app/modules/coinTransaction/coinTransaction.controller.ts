import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { CoinTransactionService } from "./coinTransaction.service";

const getMyCoinHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)?._id || (req.user as any)?.id;
  const result = await CoinTransactionService.getMyCoinHistoryFromDB(
    userId,
    req.query
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Coin transaction history retrieved successfully",
    data: result,
  });
});

const getPlayerCoinHistoryForAdmin = catchAsync(async (req: Request, res: Response) => {
  const playerId = req.params.playerId as string;
  const result = await CoinTransactionService.getPlayerCoinHistoryForAdminFromDB(
    playerId,
    req.query
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Player coin transaction history retrieved successfully",
    data: result,
  });
});

const adminAdjustCoins = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req.user as any)?._id || (req.user as any)?.id;
  const playerId = req.params.playerId as string;

  const result = await CoinTransactionService.adminAdjustCoinsInDB(
    adminId,
    playerId,
    req.body
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Player coins adjusted successfully",
    data: result,
  });
});

export const CoinTransactionController = {
  getMyCoinHistory,
  getPlayerCoinHistoryForAdmin,
  adminAdjustCoins,
};
