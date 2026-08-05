import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ManagerTeamService } from './managerTeam.service';

// ASSIGN MANAGER TO TEAM
const assignManagerToTeam = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await ManagerTeamService.assignManagerToTeamToDB(
    req.body,
    user._id
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Manager assigned to team successfully',
    data: result,
  });
});

// GET ALL
const getAllManagerTeams = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagerTeamService.getAllManagerTeamsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All manager teams retrieved successfully',
    data: result,
  });
});

// REMOVE
const removeManagerFromTeam = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagerTeamService.removeManagerFromTeamFromDB(
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Manager removed from team successfully',
    data: result,
  });
});

const getMyTeams = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as any;

  const result = await ManagerTeamService.getMyTeamsFromDB(user._id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Manager teams retrieved successfully',
    data: result,
  });
});

const bulkAssignTeams = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagerTeamService.bulkAssignTeamsToManagerInDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result,
  });
});

const bulkRemoveTeams = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagerTeamService.bulkRemoveTeamsFromManagerInDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: result,
  });
});

const removeManagerFromTeamByTeamId = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagerTeamService.removeManagerFromTeamByTeamIdFromDB(
    req.params.teamId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Manager removed from team successfully',
    data: result,
  });
});

const getManagerTeamsForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await ManagerTeamService.getMyTeamsFromDB(
    req.params.managerId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Manager teams retrieved successfully',
    data: result,
  });
});

export const ManagerTeamController = {
  assignManagerToTeam,
  getAllManagerTeams,
  removeManagerFromTeam,
  removeManagerFromTeamByTeamId,
  getManagerTeamsForAdmin,
  getMyTeams,
  bulkAssignTeams,
  bulkRemoveTeams,
};

