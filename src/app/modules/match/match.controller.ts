import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { MatchService } from './match.service';

// CREATE
const createMatch = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;

  const result = await MatchService.createMatchToDB(payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match created successfully',
    data: result,
  });
});

// GET ALL
const getAllMatches = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchService.getAllMatchesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Matches retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// SINGLE
const getSingleMatch = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    

  const result = await MatchService.getSingleMatchFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match retrieved successfully',
    data: result,
  });
});

// UPDATE
const updateMatch = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
    const payload = req.body;


  const result = await MatchService.updateMatchToDB(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match updated successfully',
    data: result,
  });
});

// DELETE
const deleteMatch = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;


  const result = await MatchService.deleteMatchFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match deleted successfully',
    data: result,
  });
});

// TOGGLE STATUS
const toggleMatchStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await MatchService.toggleMatchStatusToDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match status updated successfully',
    data: result,
  });
});

export const MatchController = {
  createMatch,
  getAllMatches,
  getSingleMatch,
  updateMatch,
  deleteMatch,
  toggleMatchStatus,
};