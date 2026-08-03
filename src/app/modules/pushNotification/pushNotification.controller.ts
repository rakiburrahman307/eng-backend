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
  const { id, role } = req.user as { id: string; role: string };
  const result = await NotificationService.getNotificationsFromDB(id, role, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notifications retrieved successfully",
    data: result.result,
    pagination: result.pagination,
  });
});
const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id: userId } = req.user as { id: string };
  const result = await NotificationService.deleteNotificationFromDB(id as string, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notification deleted successfully",
    data: result,
  });
});

const clearAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const result = await NotificationService.clearAllNotificationsFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All notifications cleared successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id: userId } = req.user as { id: string };
  const result = await NotificationService.markAsReadFromDB(id as string, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notification marked as read successfully",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };
  const result = await NotificationService.markAllAsReadFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All notifications marked as read successfully",
    data: result,
  });
});

export const NotificationController = {
  sendNotification,
  getNotifications,
  deleteNotification,
  clearAllNotifications,
  markAsRead,
  markAllAsRead,
};