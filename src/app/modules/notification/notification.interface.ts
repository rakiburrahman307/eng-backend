import { Model, Types } from "mongoose";

export enum NOTIFICATION_TYPE {
  // Auth / User
  USER_REGISTERED = "USER_REGISTERED",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  PLAYER_PROFILE_CREATED = "PLAYER_PROFILE_CREATED",

  // Transfer
  TRANSFER_REQUESTED = "TRANSFER_REQUESTED",
  TRANSFER_APPROVED = "TRANSFER_APPROVED",
  TRANSFER_REJECTED = "TRANSFER_REJECTED",

  // Reward Order
  REWARD_ORDER_PLACED = "REWARD_ORDER_PLACED",
  REWARD_ORDER_APPROVED = "REWARD_ORDER_APPROVED",
  REWARD_ORDER_REJECTED = "REWARD_ORDER_REJECTED",
  REWARD_ORDER_DELIVERED = "REWARD_ORDER_DELIVERED",

  // Subscription
  SUBSCRIPTION_ACTIVATED = "SUBSCRIPTION_ACTIVATED",
  SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED",

  // Match
  MATCH_RESULT_PUBLISHED = "MATCH_RESULT_PUBLISHED",

  // General
  GENERAL = "GENERAL",
}

export type INotification = {
  receiver: Types.ObjectId;   // কে পাবে (User _id)
  title: string;
  message: string;
  type: NOTIFICATION_TYPE;
  isRead: boolean;
  metadata?: Record<string, any>; // extra data (optional)
};

export type NotificationModel = Model<INotification>;