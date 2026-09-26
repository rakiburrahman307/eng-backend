import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationService } from "./pushNotification.service";

const sendNotification = catchAsync(async (req: Request, res: Response) => {
  const adminId = (req.user as any)?._id || (req.user as any)?.id;
  const result = await NotificationService.sendNotificationToUsers({
    ...req.body,
    adminId,
  });

  const isScheduled = req.body.isScheduled;

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: isScheduled
      ? "Push notification scheduled successfully (UK Timezone)"
      : "Push notification broadcasted successfully",
    data: result,
  });
});

const cancelScheduledNotification = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NotificationService.cancelScheduledNotificationFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Scheduled push notification cancelled successfully",
    data: result,
  });
});

const sendScheduledNow = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NotificationService.sendScheduledNowFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Scheduled notification dispatched immediately",
    data: result,
  });
});

const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const { id, role } = req.user as { id: string; role: string };
  const result = await NotificationService.getNotificationsFromDB(id, role, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Push notifications retrieved successfully",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NotificationService.deleteNotificationFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Notification deleted successfully",
    data: result,
  });
});

const clearAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.clearAllNotificationsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All notifications cleared successfully",
    data: result,
  });
});

export const NotificationController = {
  sendNotification,
  cancelScheduledNotification,
  sendScheduledNow,
  getNotifications,
  deleteNotification,
  clearAllNotifications,
};