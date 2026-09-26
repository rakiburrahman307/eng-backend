import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { notificationQueue } from "../../../helpers/bullMQ/bullQueueInstance";
import { NotificationHelper } from "../../builder/PushNotifications";
import { PushNotification } from "./pushNotification.model";

dayjs.extend(utc);
dayjs.extend(timezone);

const UK_TIMEZONE = "Europe/London";

interface SendNotificationPayload {
  title: string;
  message: string;
  user?: string; // optional single user ID
  targetRole?: string; // "ALL" | "PLAYER" | "PARENT" | "REFEREE" | "COACH"
  isScheduled?: boolean;
  scheduledAt?: string; // e.g. "2026-09-27 15:30" or ISO string
  adminId?: string;
}

const sendNotificationToUsers = async (payload: SendNotificationPayload) => {
  const { title, message, user, targetRole = "ALL", isScheduled, scheduledAt, adminId } = payload;

  if (!title || !title.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Notification title is required");
  }
  if (!message || !message.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Notification message is required");
  }

  // ----------------------------------------------------
  // CASE A: SCHEDULED NOTIFICATION (BULLMQ + UK TIMEZONE)
  // ----------------------------------------------------
  if (isScheduled && scheduledAt) {
    // 1. Parse date in UK Timezone (Europe/London)
    const scheduledUkTime = dayjs.tz(scheduledAt, UK_TIMEZONE);
    if (!scheduledUkTime.isValid()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid scheduled date/time format for UK timezone");
    }

    const scheduledDateUtc = scheduledUkTime.toDate();
    const nowUtc = new Date();
    const delayMs = scheduledDateUtc.getTime() - nowUtc.getTime();

    // Validate that schedule time is strictly in the future (minimum 10 seconds ahead)
    if (delayMs < 10000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Scheduled time must be at least 10 seconds in the future (UK Time). Specified UK time: ${scheduledUkTime.format(
          "YYYY-MM-DD HH:mm:ss"
        )} BST/GMT.`
      );
    }

    const formattedUkTime = scheduledUkTime.format("YYYY-MM-DD HH:mm (Europe/London)");

    // 2. Create database log with SCHEDULED status
    const notification = await PushNotification.create({
      title: title.trim(),
      message: message.trim(),
      user: user || null,
      targetRole: targetRole || "ALL",
      isScheduled: true,
      scheduledAt: scheduledDateUtc,
      scheduledAtUK: formattedUkTime,
      status: "SCHEDULED",
      sentAt: null,
      createdBy: adminId || null,
    });

    // 3. Register delayed job in BullMQ notificationQueue
    const job = await notificationQueue.add(
      "scheduled-push-notification",
      {
        pushNotificationId: notification._id.toString(),
        title: title.trim(),
        message: message.trim(),
        targetRole,
        userId: user,
      },
      {
        delay: delayMs,
        removeOnComplete: true,
      }
    );

    notification.jobId = job.id;
    await notification.save();

    return notification;
  }

  // ----------------------------------------------------
  // CASE B: IMMEDIATE BROADCAST / DIRECT SEND
  // ----------------------------------------------------
  const notification = await PushNotification.create({
    title: title.trim(),
    message: message.trim(),
    user: user || null,
    targetRole: targetRole || "ALL",
    isScheduled: false,
    scheduledAt: null,
    scheduledAtUK: null,
    status: "SENT",
    sentAt: new Date(),
    createdBy: adminId || null,
  });

  if (user) {
    // Send to single user immediately
    await NotificationHelper.sendToUser(user, {
      title: title.trim(),
      body: message.trim(),
      type: "SYSTEM",
    });
  } else {
    // Role-filtered or All Verified users
    const userFilter: any = { verified: true };
    if (targetRole && targetRole !== "ALL") {
      userFilter.role = targetRole;
    }
    const verifiedUsers = await User.find(userFilter).select("_id").lean();
    const userIds = verifiedUsers.map((u) => u._id);

    if (userIds.length > 0) {
      await NotificationHelper.sendToBatch(userIds, {
        title: title.trim(),
        body: message.trim(),
        type: "SYSTEM",
      });
    }
  }

  return notification;
};

// CANCEL A SCHEDULED NOTIFICATION
const cancelScheduledNotificationFromDB = async (id: string) => {
  const notification = await PushNotification.findById(id);
  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Push notification not found");
  }

  if (notification.status !== "SCHEDULED") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel notification with status '${notification.status}'. Only SCHEDULED notifications can be cancelled.`
    );
  }

  // Remove the BullMQ delayed job if present
  if (notification.jobId) {
    try {
      const job = await notificationQueue.getJob(notification.jobId);
      if (job) {
        await job.remove();
      }
    } catch {
      // Ignore if job already removed or missing from Redis
    }
  }

  notification.status = "CANCELLED";
  await notification.save();

  return notification;
};

// IMMEDIATELY TRIGGER A SCHEDULED NOTIFICATION (SEND NOW)
const sendScheduledNowFromDB = async (id: string) => {
  const notification = await PushNotification.findById(id);
  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Push notification not found");
  }

  if (notification.status === "SENT") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Notification has already been sent");
  }

  // Remove pending BullMQ job
  if (notification.jobId) {
    try {
      const job = await notificationQueue.getJob(notification.jobId);
      if (job) {
        await job.remove();
      }
    } catch {
      // Ignore Redis error
    }
  }

  // Dispatch immediately
  if (notification.user) {
    await NotificationHelper.sendToUser(notification.user.toString(), {
      title: notification.title,
      body: notification.message,
      type: "SYSTEM",
    });
  } else {
    const userFilter: any = { verified: true };
    if (notification.targetRole && notification.targetRole !== "ALL") {
      userFilter.role = notification.targetRole;
    }
    const targetUsers = await User.find(userFilter).select("_id").lean();
    const userIds = targetUsers.map((u) => u._id);
    if (userIds.length > 0) {
      await NotificationHelper.sendToBatch(userIds, {
        title: notification.title,
        body: notification.message,
        type: "SYSTEM",
      });
    }
  }

  notification.status = "SENT";
  notification.sentAt = new Date();
  await notification.save();

  return notification;
};

const getNotificationsFromDB = async (id: string, role: string, query: Record<string, any>) => {
  const baseQuery = PushNotification.find()
    .populate("user", "userName email image firstName lastName role")
    .populate("createdBy", "userName email firstName lastName");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["title", "message", "status", "targetRole"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;
  const pagination = await queryBuilder.getPaginationInfo();

  return {
    result,
    pagination,
  };
};

const deleteNotificationFromDB = async (id: string) => {
  const notification = await PushNotification.findById(id);
  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
  }

  // If delayed job exists in Redis, remove it
  if (notification.jobId && notification.status === "SCHEDULED") {
    try {
      const job = await notificationQueue.getJob(notification.jobId);
      if (job) {
        await job.remove();
      }
    } catch {
      // Ignore
    }
  }

  const result = await PushNotification.findByIdAndDelete(id);
  return result;
};

const clearAllNotificationsFromDB = async () => {
  // Cancel any active scheduled jobs in Redis first
  const scheduledList = await PushNotification.find({ status: "SCHEDULED" }).select("jobId").lean();
  for (const item of scheduledList) {
    if (item.jobId) {
      try {
        const job = await notificationQueue.getJob(item.jobId);
        if (job) await job.remove();
      } catch {
        // Ignore
      }
    }
  }

  const result = await PushNotification.deleteMany();
  return result;
};

export const NotificationService = {
  sendNotificationToUsers,
  cancelScheduledNotificationFromDB,
  sendScheduledNowFromDB,
  getNotificationsFromDB,
  deleteNotificationFromDB,
  clearAllNotificationsFromDB,
};