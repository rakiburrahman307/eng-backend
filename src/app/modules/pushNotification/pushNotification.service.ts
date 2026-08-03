import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { PushNotification } from "./pushNotification.model";


const sendNotificationToUsers = async (payload: {
  title: string;
  message: string;
  user?: string; // optional single user
}) => {
  // 1. Create a log record in the database
  const notification = await PushNotification.create(payload);

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
  const baseQuery = PushNotification.find().populate("user", "userName email image");

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


const deleteNotificationFromDB = async (id: string) => {
  const result = await PushNotification.findByIdAndDelete(id);
  return result;
};

const clearAllNotificationsFromDB = async () => {
  const result = await PushNotification.deleteMany();
  return result;
};


export const NotificationService = {
  sendNotificationToUsers,
  getNotificationsFromDB,
  deleteNotificationFromDB,
  clearAllNotificationsFromDB,
};