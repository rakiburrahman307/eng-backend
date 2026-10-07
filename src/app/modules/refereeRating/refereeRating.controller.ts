import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { MatchEvaluationService } from './refereeRating.service';


// CREATE OR UPDATE
const createEvaluation = catchAsync(async (req: Request, res: Response) => {
  const userRole = (req.user as any)?.role;
  const result = await MatchEvaluationService.createEvaluationIntoDB(req.body, userRole);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match evaluation saved successfully',
    data: result,
  });
});

// GET ALL
const getAllEvaluations = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchEvaluationService.getAllEvaluationsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All match evaluations retrieved successfully',
    data: result,
  });
});

// GET BY MATCH ID
const getEvaluationByMatch = catchAsync(async (req: Request, res: Response) => {
  const matchId = req.params.matchId as string;
  const result = await MatchEvaluationService.getEvaluationByMatchIdFromDB(matchId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match evaluation retrieved successfully',
    data: result,
  });
});

// GET SINGLE
const getSingleEvaluation = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await MatchEvaluationService.getSingleEvaluationFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Match evaluation retrieved successfully',
    data: result,
  });
});

export const MatchEvaluationController = {
  createEvaluation,
  getAllEvaluations,
  getEvaluationByMatch,
  getSingleEvaluation,
};