import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { OverviewService } from "./overview.service";

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const result = await OverviewService.getOverviewFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Overview data fetched successfully",
    data: result,
  });
});

export const OverviewController = {
  getOverview,
};