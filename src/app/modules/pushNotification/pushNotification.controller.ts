import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationService } from "./pushNotification.service";


const sendNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.sendNotificationToUsers(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Notification sent successfully",
    data: result,
  });
});

const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getNotificationsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notifications retrieved successfully",
    data: result.result,
    pagination: result.pagination,
  });
});
export const NotificationController = {
  sendNotification,
  getNotifications,
};