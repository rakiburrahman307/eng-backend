import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { NOTIFICATION_TYPE } from "./notification.interface";
import { Notification } from "./notification.model";
import { Notification as PushNotification } from "../pushNotification/pushNotification.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: SEND NOTIFICATION TO ALL USERS
// ─────────────────────────────────────────────────────────────────────────────
const sendToAllUsers = async (payload: {
  title: string;
  message: string;
  type?: NOTIFICATION_TYPE;
}) => {
  const users = await User.find({ verified: true }, "_id");

  if (!users.length) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No users found");
  }

  const userIds = users.map((user) => user._id.toString());

  // Dispatch FCM Push notification, save to DB, and emit to socket via background queue
  await NotificationQueueHelper.sendBulkNotifications(
    userIds,
    payload.title,
    payload.message,
    payload.type || NOTIFICATION_TYPE.GENERAL
  );

  // Save a single log in PushNotification collection for Admin's sent history
  await PushNotification.create({
    title: payload.title,
    message: payload.message,
    user: null, // null means all users
    isRead: false
  });

  return { message: "Notifications successfully dispatched" };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET ALL NOTIFICATIONS (all users, paginated)
// ─────────────────────────────────────────────────────────────────────────────
const getAllNotificationsForAdmin = async (query: Record<string, any>) => {
  const notificationQuery = new QueryBuilder(
    PushNotification.find().populate("user", "userName email profile role"),
    query
  )
    .search(["title", "message"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.getPaginationInfo();

  return { meta, result };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: GET OWN NOTIFICATIONS (paginated)
// ─────────────────────────────────────────────────────────────────────────────
const getMyNotifications = async (
  userId: string,
  query: Record<string, any>
) => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ receiver: userId }).sort({ createdAt: -1 }),
    query
  )
    .filter()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.getPaginationInfo();

  return { meta, result };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: GET UNREAD COUNT
// ─────────────────────────────────────────────────────────────────────────────
const getUnreadCount = async (userId: string) => {
  const count = await Notification.countDocuments({
    receiver: userId,
    isRead: false,
  });

  return { unreadCount: count };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: MARK SINGLE NOTIFICATION AS READ
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    receiver: userId,
  });

  if (!notification) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Notification not found or not yours"
    );
  }

  notification.isRead = true;
  await notification.save();

  return notification;
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER: MARK ALL NOTIFICATIONS AS READ
// ─────────────────────────────────────────────────────────────────────────────
const markAllAsRead = async (userId: string) => {
  const result = await Notification.updateMany(
    { receiver: userId, isRead: false },
    { $set: { isRead: true } }
  );

  return {
    modifiedCount: result.modifiedCount,
    message: `${result.modifiedCount} notifications marked as read`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: DELETE NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────
const deleteNotificationFromDB = async (id: string) => {
  const result = await PushNotification.findByIdAndDelete(id);

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
  }

  return result;
};

export const NotificationService = {
  sendToAllUsers,
  getAllNotificationsForAdmin,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificationFromDB,
};
