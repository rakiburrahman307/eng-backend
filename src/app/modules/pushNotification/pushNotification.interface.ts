import { Model, Types } from "mongoose";
import { NOTIFICATION_CATEGORY } from "../notification/notification.interface";

export type TPushNotificationStatus = "SENT" | "SCHEDULED" | "CANCELLED" | "FAILED";
export type TPushNotificationAudience = "ALL" | "PLAYER" | "PARENT" | "REFEREE" | "COACH" | "SINGLE_USER";

export interface INotification {
  title: string;
  message: string;
  user?: Types.ObjectId | null;
  targetRole?: string | null;
  category?: NOTIFICATION_CATEGORY | string;
  isRead: boolean;
  isScheduled?: boolean;
  scheduledAt?: Date | null;
  scheduledAtUK?: string | null;
  status?: TPushNotificationStatus;
  sentAt?: Date | null;
  jobId?: string | null;
  createdBy?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}