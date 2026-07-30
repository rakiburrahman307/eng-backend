import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TournamentClaimService } from './tournamentClaim.service';

const createClaim = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await TournamentClaimService.createClaimToDB(user._id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Tournament claim submitted successfully',
    data: result,
  });
});

const getAllClaims = catchAsync(async (req: Request, res: Response) => {
  const { result, meta } = await TournamentClaimService.getAllClaimsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tournament claims retrieved successfully',
    data: result,
    pagination: meta,
  });
});

const getMyClaims = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await TournamentClaimService.getMyClaimsFromDB(user._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My tournament claims retrieved successfully',
    data: result,
  });
});

const reviewClaim = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body;

  const result = await TournamentClaimService.reviewClaimInDB(
    id,
    user._id,
    status
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `Tournament claim ${status} successfully`,
    data: result,
  });
});

export const TournamentClaimController = {
  createClaim,
  getAllClaims,
  getMyClaims,
  reviewClaim,
};
