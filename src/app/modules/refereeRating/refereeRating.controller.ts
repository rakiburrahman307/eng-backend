import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { MatchEvaluationService } from './refereeRating.service';


// CREATE
const createEvaluation = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchEvaluationService.createEvaluationIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Match evaluation created successfully',
    data: result,
  });
});

// GET ALL
const getAllEvaluations = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchEvaluationService.getAllEvaluationsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All match evaluations retrieved successfully',
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
  getSingleEvaluation,
};