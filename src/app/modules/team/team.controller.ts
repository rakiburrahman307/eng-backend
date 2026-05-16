import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TeamService } from './team.service';

// CREATE
const createTeam = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { image?: Express.Multer.File[] };

  const logo = files?.image?.[0];

  let data: any = {};

  if (req.body?.data) {
    try {
      data = JSON.parse(req.body.data);
    } catch {}
  } else {
    data = req.body;
  }

  const payload: any = { ...data };

  if (logo) {
    payload.teamLogo = logo.path.replace(/\\/g, '/').split('uploads')[1];
  }

  const result = await TeamService.createTeamToDB(payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team created successfully',
    data: result,
  });
});

// GET ALL
const getAllTeams = catchAsync(async (req: Request, res: Response) => {
  const result = await TeamService.getAllTeamsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Teams retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// SINGLE
const getSingleTeam = catchAsync(async (req: Request, res: Response) => {
  const result = await TeamService.getSingleTeamFromDB(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team retrieved successfully',
    data: result,
  });
});

// UPDATE
const updateTeam = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as { image?: Express.Multer.File[] };

  const logo = files?.image?.[0];

  let data: any = req.body;

  if (req.body?.data) {
    try {
      data = JSON.parse(req.body.data);
    } catch {}
  }

  const payload: any = { ...data };

  if (logo) {
    payload.teamLogo = logo.path.replace(/\\/g, '/').split('uploads')[1];
  }

  const result = await TeamService.updateTeamToDB(req.params.id as string, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team updated successfully',
    data: result,
  });
});

// DELETE
const deleteTeam = catchAsync(async (req: Request, res: Response) => {
  const result = await TeamService.deleteTeamFromDB(req.params.id as string);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team deleted successfully',
    data: result,
  });
});

export const TeamController = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
};