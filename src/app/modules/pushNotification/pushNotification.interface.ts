import { Model, Types } from "mongoose";

export type TPushNotificationStatus = "SENT" | "SCHEDULED" | "CANCELLED" | "FAILED";
export type TPushNotificationAudience = "ALL" | "PLAYER" | "PARENT" | "REFEREE" | "COACH" | "SINGLE_USER";

export interface INotification {
  title: string;
  message: string;
  user?: Types.ObjectId | null;
  targetRole?: string | null;
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