import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { NOTIFICATION_TYPE } from "./notification.interface";
import { Notification } from "./notification.model";
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

  return { message: "Notifications successfully dispatched" };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GET ALL NOTIFICATIONS (all users, paginated)
// ─────────────────────────────────────────────────────────────────────────────
const getAllNotificationsForAdmin = async (id: string, query: Record<string, any>) => {
  const notificationQuery = new QueryBuilder(
    Notification.find({ receiver: id }).populate("receiver", "userName email profile role"),
    query
  )
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
  const notification = await Notification.findById(id);

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Notification not found");
  }

  return await Notification.findByIdAndDelete(id);
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
