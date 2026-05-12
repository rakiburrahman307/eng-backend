import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { MatchResultService } from './matchResult.service';

// CREATE
const createMatchResult = catchAsync(async (req: Request, res: Response) => {
  const user = req.user; 

  const payload = {
    ...req.body,
    addedBy: user?._id, 
  };

  const result = await MatchResultService.createMatchResultToDB(payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match event created successfully',
    data: result,
  });
});

// GET ALL
const getAllMatchResults = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchResultService.getAllMatchResultsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match events retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// SINGLE
const getSingleMatchResult = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await MatchResultService.getSingleMatchResultFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match event retrieved successfully',
    data: result,
  });
});

// UPDATE
const updateMatchResult = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await MatchResultService.updateMatchResultToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match event updated successfully',
    data: result,
  });
});

// DELETE
const deleteMatchResult = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await MatchResultService.deleteMatchResultFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match event deleted successfully',
    data: result,
  });
});

// MATCH WISE EVENTS
const getMatchWiseResults = catchAsync(async (req: Request, res: Response) => {
  const matchId = req.params.matchId as string;

  const result = await MatchResultService.getMatchWiseResultsFromDB(matchId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match wise events retrieved successfully',
    data: result,
  });
});

export const MatchResultController = {
  createMatchResult,
  getAllMatchResults,
  getSingleMatchResult,
  updateMatchResult,
  deleteMatchResult,
  getMatchWiseResults,
};