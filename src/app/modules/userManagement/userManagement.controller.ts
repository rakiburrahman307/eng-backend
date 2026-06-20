// user.controller.ts

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserManagementService } from './userManagement.service';

// GET ALL USERS
const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.getAllUsersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Users retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// TOGGLE VERIFIED
const toggleVerified = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.toggleVerifiedToDB(
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User verification status updated successfully',
    data: result,
  });
});

// DELETE USER
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.deleteUserFromDB(
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User deleted successfully',
    data: result,
  });
});


const getAllReferees = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.getAllRefereesFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Referees retrieved successfully",
    data: result,
  });
});

const getAllManagers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.getAllManagersFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Referees retrieved successfully",
    data: result,
  });
});


export const UserManagementController = {
  getAllUsers,
  toggleVerified,
    deleteUser,
  getAllReferees,
  getAllManagers
};