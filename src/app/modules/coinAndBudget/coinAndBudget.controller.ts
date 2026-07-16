import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { CoinAndBudgetService } from './coinAndBudget.service';

// ==========================================
// Player Economy Controllers
// ==========================================

const savePlayerEconomy = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinAndBudgetService.savePlayerEconomyToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Player Economy configuration saved successfully',
    data: result,
  });
});

const getPlayerEconomy = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinAndBudgetService.getPlayerEconomyFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Player Economy configuration retrieved successfully',
    data: result,
  });
});

const deletePlayerEconomy = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinAndBudgetService.deletePlayerEconomyFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Player Economy configuration deleted successfully',
    data: result,
  });
});

// ==========================================
// Club Economy Controllers
// ==========================================

const saveClubEconomy = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinAndBudgetService.saveClubEconomyToDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Club Economy configuration saved successfully',
    data: result,
  });
});

const getClubEconomy = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinAndBudgetService.getClubEconomyFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Club Economy configuration retrieved successfully',
    data: result,
  });
});

const deleteClubEconomy = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinAndBudgetService.deleteClubEconomyFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Club Economy configuration deleted successfully',
    data: result,
  });
});

export const CoinAndBudgetController = {
  savePlayerEconomy,
  getPlayerEconomy,
  deletePlayerEconomy,
  saveClubEconomy,
  getClubEconomy,
  deleteClubEconomy,
};
