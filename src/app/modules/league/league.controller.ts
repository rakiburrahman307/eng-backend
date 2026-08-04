import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LeagueService } from './league.service';

// CREATE
const createLeague = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await LeagueService.createLeagueToDB(
    req.body,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'League created successfully',
    data: result,
  });
});

// GET ALL
const getAllLeagues = catchAsync(async (req: Request, res: Response) => {
  const result = await LeagueService.getAllLeaguesFromDB(
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Leagues retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// GET SINGLE
const getSingleLeague = catchAsync(async (req: Request, res: Response) => {
  const result = await LeagueService.getSingleLeagueFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'League retrieved successfully',
    data: result,
  });
});

// UPDATE
const updateLeague = catchAsync(async (req: Request, res: Response) => {
  const result = await LeagueService.updateLeagueToDB(
    req.params.id as string,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'League updated successfully',
    data: result,
  });
});

// DELETE
const deleteLeague = catchAsync(async (req: Request, res: Response) => {
  const result = await LeagueService.deleteLeagueFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'League deleted successfully',
    data: result,
  });
});

const getUniqueSeasons = catchAsync(async (req: Request, res: Response) => {
  const result = await LeagueService.getUniqueSeasonsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Unique seasons retrieved successfully',
    data: result,
  });
});

export const LeagueController = {
  createLeague,
  getAllLeagues,
  getSingleLeague,
  updateLeague,
  deleteLeague,
  getUniqueSeasons,
};