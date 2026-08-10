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


const getUserAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.getUserAnalyticsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "User management analytics retrieved successfully",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const result = await UserManagementService.updateUserRoleToDB(
    req.params.id as string,
    req.body.role as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "User role updated successfully",
    data: result,
  });
});

const updateUserProfileByAdmin = catchAsync(async (req: Request, res: Response) => {
  let profile = req.body.profile;
  const files = req.files as any;
  if (files) {
    const profileFile = files.profile?.[0] || files.image?.[0] || files.profilePic?.[0];
    if (profileFile) {
      profile = `/images/${profileFile.filename}`;
    }
  }

  const payload: Record<string, any> = {
    ...req.body,
  };
  if (profile) {
    payload.profile = profile;
  }

  const result = await UserManagementService.updateUserProfileByAdminToDB(
    req.params.id as string,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "User profile updated successfully by Admin",
    data: result,
  });
});

export const UserManagementController = {
  getAllUsers,
  toggleVerified,
  deleteUser,
  getAllReferees,
  getAllManagers,
  getUserAnalytics,
  updateUserRole,
  updateUserProfileByAdmin,
};