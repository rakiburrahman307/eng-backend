import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TournamentService } from './tournament.service';

const createTournament = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;
  const result = await TournamentService.createTournamentToDB(req.body, user?._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Tournament created successfully',
    data: result,
  });
});

const getAllTournaments = catchAsync(async (req: Request, res: Response) => {
  const { result, meta } = await TournamentService.getAllTournamentsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tournaments retrieved successfully',
    data: result,
    pagination: meta,
  });
});

const getSingleTournament = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TournamentService.getSingleTournamentFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tournament retrieved successfully',
    data: result,
  });
});

const updateTournament = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TournamentService.updateTournamentInDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tournament updated successfully',
    data: result,
  });
});

const deleteTournament = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TournamentService.deleteTournamentFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Tournament deleted successfully',
    data: result,
  });
});

export const TournamentController = {
  createTournament,
  getAllTournaments,
  getSingleTournament,
  updateTournament,
  deleteTournament,
};
