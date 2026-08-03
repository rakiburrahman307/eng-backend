import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationService } from "./notification.service";
import ApiError from "../../../errors/ApiErrors";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: SEND TO ALL USERS
// ─────────────────────────────────────────────────────────────────────────────
const sendToAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.sendToAllUsers(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notification sent to all users successfully",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET ALL NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const getAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getAllNotificationsForAdmin(
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All notifications retrieved successfully",
    pagination: result.meta,
    data: result.result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: GET MY NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;

  const result = await NotificationService.getMyNotifications(
    userId,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Your notifications retrieved successfully",
    pagination: result.meta,
    data: result.result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: GET UNREAD COUNT
// ─────────────────────────────────────────────────────────────────────────────
const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;

  const result = await NotificationService.getUnreadCount(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Unread notification count retrieved",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: MARK SINGLE AS READ
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const { id } = req.params;

  if (typeof id !== "string") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Notification ID must be a string");
  }

  const result = await NotificationService.markAsRead(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notification marked as read",
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: MARK ALL AS READ
// ─────────────────────────────────────────────────────────────────────────────
const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;

  const result = await NotificationService.markAllAsRead(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
    data: { modifiedCount: result.modifiedCount },
  });
});
// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: DELETE ALL NOTIFICATIONS 
// ─────────────────────────────────────────────────────────────────────────────
const deleteAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const { id: userId } = req.user as { id: string };

  const result = await NotificationService.deleteAllNotifications(userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All notifications deleted successfully",
    data: {},
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: DELETE NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.clearNotificationFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notification deleted successfully",
    data: result,
  });
});

export const NotificationController = {
  sendToAllUsers,
  getAllNotifications,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
};