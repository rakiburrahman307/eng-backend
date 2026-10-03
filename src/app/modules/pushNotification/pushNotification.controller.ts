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

const getMatchReminderSettings = catchAsync(async (req: Request, res: Response) => {
  const { getEffectiveMatchSetting } = await import("../match/matchSetting.model");
  const result = await getEffectiveMatchSetting();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Match reminder settings retrieved successfully",
    data: result,
  });
});

const updateMatchReminderSettings = catchAsync(async (req: Request, res: Response) => {
  const { getEffectiveMatchSetting } = await import("../match/matchSetting.model");
  const setting = (await getEffectiveMatchSetting()) as any;

  if (req.body.isMatchReminderEnabled !== undefined) {
    setting.isMatchReminderEnabled = Boolean(req.body.isMatchReminderEnabled);
  }
  if (req.body.matchReminderHours !== undefined) {
    setting.matchReminderHours = Math.max(1, Math.min(168, Number(req.body.matchReminderHours) || 24));
  }
  if (req.body.matchReminderAudience !== undefined) {
    setting.matchReminderAudience = req.body.matchReminderAudience === "ALL" ? "ALL" : "STAKEHOLDERS";
  }
  if (req.body.customReminderTitle !== undefined) {
    setting.customReminderTitle = String(req.body.customReminderTitle).trim();
  }
  if (req.body.customReminderMessage !== undefined) {
    setting.customReminderMessage = String(req.body.customReminderMessage).trim();
  }
  if (req.body.timezone !== undefined) {
    setting.timezone = String(req.body.timezone).trim() || "Europe/London";
  }

  await setting.save();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Match reminder settings updated successfully",
    data: setting,
  });
});

const getUpcomingMatchesPreview = catchAsync(async (req: Request, res: Response) => {
  const { getUpcomingMatchesForAdminPreview } = await import("../../../helpers/matchReminderHelper");
  const result = await getUpcomingMatchesForAdminPreview({
    limit: Number(req.query.limit) || 20,
    page: Number(req.query.page) || 1,
    status: req.query.status as string,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Upcoming matches preview retrieved successfully",
    data: result,
  });
});

const triggerMatchRemindersNow = catchAsync(async (req: Request, res: Response) => {
  const { checkAndSendUpcomingMatchReminders } = await import("../../../helpers/matchReminderHelper");
  const result = await checkAndSendUpcomingMatchReminders();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: `Match reminder check complete: ${result.processedMatches} matches processed, ${result.totalRecipients} notifications dispatched.`,
    data: result,
  });
});

const sendSingleMatchReminderNow = catchAsync(async (req: Request, res: Response) => {
  const { sendSingleMatchReminder } = await import("../../../helpers/matchReminderHelper");
  const result = await sendSingleMatchReminder(String(req.params.matchId), { force: true });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: result.message,
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
  getMatchReminderSettings,
  updateMatchReminderSettings,
  getUpcomingMatchesPreview,
  triggerMatchRemindersNow,
  sendSingleMatchReminderNow,
};