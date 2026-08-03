import QueryBuilder from "../../../util/queryBuilder";
import { Notification } from "./pushNotification.model";
import { User } from "../user/user.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";


const sendNotificationToUsers = async (payload: {
  title: string;
  message: string;
  user?: string; // optional single user
}) => {
  // 1. Create a log record in the database
  const notification = await Notification.create(payload);

  // 2. Dispatch push & in-app notifications
  if (payload.user) {
    // Send to a single specific user
    await NotificationQueueHelper.sendNotification(
      payload.user,
      payload.message,
      payload.title,
      'SYSTEM'
    );
  } else {
    // Send to all verified users in the system
    const verifiedUsers = await User.find({ verified: true }).select("_id").lean();
    const userIds = verifiedUsers.map((u) => u._id.toString());

    if (userIds.length > 0) {
      await NotificationQueueHelper.sendBulkNotifications(
        userIds,
        payload.title,
        payload.message,
        'SYSTEM'
      );
    }
  }

  return notification;
};

const getNotificationsFromDB = async (id: string, role: string, query: Record<string, any>) => {
  let filter: any = {};

  // If the user is NOT an admin/super_admin, filter notifications sent to them or everyone (null)
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    filter = { $or: [{ user: id }, { user: null }] };
  }

  const baseQuery = Notification.find(filter).populate("user", "userName email image");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["title", "message"])
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


const deleteNotificationFromDB = async (id: string, userId: string) => {
  const result = await Notification.findOneAndDelete({ _id: id, user: userId });
  return result;
};

const clearAllNotificationsFromDB = async (userId: string) => {
  const result = await Notification.deleteMany({ user: userId });
  return result;
};

const markAsReadFromDB = async (id: string, userId: string) => {
  const result = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { isRead: true },
    { new: true }
  );
  return result;
};

const markAllAsReadFromDB = async (userId: string) => {
  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true }
  );
  return result;
};

export const NotificationService = {
  sendNotificationToUsers,
  getNotificationsFromDB,
  deleteNotificationFromDB,
  clearAllNotificationsFromDB,
  markAsReadFromDB,
  markAllAsReadFromDB,
};