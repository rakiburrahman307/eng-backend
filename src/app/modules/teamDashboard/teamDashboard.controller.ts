import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TeamDashboardService } from "./teamDashboard.service";

// GET TEAM DASHBOARD
const getTeamDashboard = catchAsync(async (req, res) => {
  const teamId = req.params.teamId as string;

  // Support both Token (req.user) and Query Param (?userId=...)
  const userId =
    (req.user as any)?._id ||
    (req.user as any)?.id ||
    (req.query.userId as string);

  const result = await TeamDashboardService.getTeamDashboardFromDB(
    teamId,
    userId
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Team dashboard retrieved successfully",
    data: result,
  });
});


const getClubOverview = catchAsync(
  async (req, res) => {
    const teamId = req.params.teamId as string;

    const result =
      await TeamDashboardService.getClubOverviewFromDB(
        teamId
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Club overview retrieved successfully",
      data: result,
    });
  }
);

export const TeamDashboardController = {
  getTeamDashboard,
  getClubOverview,
};