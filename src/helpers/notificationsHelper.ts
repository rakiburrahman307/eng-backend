import { INotification, NOTIFICATION_TYPE } from "../app/modules/notification/notification.interface";
import { Notification } from "../app/modules/notification/notification.model";
import { User } from "../app/modules/user/user.model";

// ─────────────────────────────────────────────────────────────────────────────
// Send a notification to a SINGLE user (real-time via socket)
// ─────────────────────────────────────────────────────────────────────────────
export const sendNotification = async (data: {
  receiver: string;         // User _id (string or ObjectId)
  title: string;
  message: string;
  type?: NOTIFICATION_TYPE;
  metadata?: Record<string, any>;
}): Promise<INotification> => {
  const notification = await Notification.create({
    receiver: data.receiver,
    title: data.title,
    message: data.message,
    type: data.type || NOTIFICATION_TYPE.GENERAL,
    isRead: false,
    metadata: data.metadata || {},
  }) as INotification;

  // Emit to user-specific socket room
  //@ts-ignore
  const io = global.io;
  if (io) {
    io.to(`user-${data.receiver}`).emit("notification", notification);
  }

  return notification;
};

// ─────────────────────────────────────────────────────────────────────────────
// Send a notification to ALL ADMINS
// ─────────────────────────────────────────────────────────────────────────────
export const sendNotificationToAdmins = async (data: {
  title: string;
  message: string;
  type?: NOTIFICATION_TYPE;
  metadata?: Record<string, any>;
}): Promise<void> => {
  // Find all admin users
  const admins = await User.find(
    { role: { $in: ["ADMIN", "SUPER_ADMIN"] } },
    "_id"
  );

  if (!admins.length) return;

  const notifications = admins.map((admin) => ({
    receiver: admin._id,
    title: data.title,
    message: data.message,
    type: data.type || NOTIFICATION_TYPE.GENERAL,
    isRead: false,
    metadata: data.metadata || {},
  }));

  await Notification.insertMany(notifications);

  // Emit real-time socket to each admin
  //@ts-ignore
  const io = global.io;
  if (io) {
    admins.forEach((admin) => {
      io.to(`user-${admin._id}`).emit("notification", {
        title: data.title,
        message: data.message,
        type: data.type || NOTIFICATION_TYPE.GENERAL,
      });
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Legacy export (backward-compatible with old code if any)
// ─────────────────────────────────────────────────────────────────────────────
export const sendNotifications = sendNotification;