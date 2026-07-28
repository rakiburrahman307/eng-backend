import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PlayerStatsService } from './playerStats.service';

// GET ALL (LEADERBOARD)
const getAllPlayerStats = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayerStatsService.getAllPlayerStatsFromDB(req.user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Player stats retrieved successfully',
    data: result,
  });
});

// GET SINGLE PLAYER STATS
const getSinglePlayerStats = catchAsync(async (req: Request, res: Response) => {
  const playerId = req.params.playerId as string;

  const result = await PlayerStatsService.getSinglePlayerStatsFromDB(playerId, req.user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: typeof result === 'string' ? result : 'Player stats retrieved successfully',
    data: result,
  });
});

// ADMIN UPDATE
const updatePlayerStats = catchAsync(async (req: Request, res: Response) => {
  const playerId = req.params.playerId as string;

  const result = await PlayerStatsService.updatePlayerStatsFromDB(
    playerId,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Player stats updated successfully',
    data: result,
  });
});

export const PlayerStatsController = {
  getAllPlayerStats,
  getSinglePlayerStats,
  updatePlayerStats,
};