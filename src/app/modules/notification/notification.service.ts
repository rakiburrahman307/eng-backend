import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { Notification } from "./notification.model";

// SEND NOTIFICATION TO ALL USERS
const sendToAllUsers = async (payload: { title: string; message: string }) => {
  const users = await User.find({}, "_id");

  if (!users.length) {
    throw new Error("No users found");
  }

  const notifications = users.map((user) => ({
    user: user._id,
    title: payload.title,
    message: payload.message,
    read: false,
    createdAt: new Date(),
  }));

  const result = await Notification.insertMany(notifications);

  return result;
};
// GET ALL NOTIFICATIONS
const getAllNotifications = async (query: Record<string, any>) => {
  const notificationQuery = new QueryBuilder(
    Notification.find().populate("user", "userName email"),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await notificationQuery.modelQuery;
  const meta = await notificationQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// DELETE NOTIFICATION
const deleteNotificationFromDB = async (id: string) => {
  const notification = await Notification.findById(id);

  if (!notification) {
    throw new Error("Notification not found");
  }

  return await Notification.findByIdAndDelete(id);
};

export const NotificationService = {
  sendToAllUsers,
  getAllNotifications,
  deleteNotificationFromDB,
};
