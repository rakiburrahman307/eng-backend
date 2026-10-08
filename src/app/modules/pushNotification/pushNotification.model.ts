import { Schema, model } from "mongoose";
import { INotification } from "./pushNotification.interface";
import { NOTIFICATION_CATEGORY } from "../notification/notification.interface";

const pushNotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = broadcast/role-based
    },
    targetRole: {
      type: String,
      default: "ALL", // "ALL" | "PLAYER" | "PARENT" | "REFEREE" | "COACH"
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORY),
      default: NOTIFICATION_CATEGORY.GENERAL_NEWS,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    scheduledAtUK: {
      type: String,
      default: null, // human-readable UK timezone string
    },
    status: {
      type: String,
      enum: ["SENT", "SCHEDULED", "CANCELLED", "FAILED"],
      default: "SENT",
    },
    sentAt: {
      type: Date,
      default: null,
    },
    jobId: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup and scheduling queries
pushNotificationSchema.index({ status: 1, scheduledAt: 1 });
pushNotificationSchema.index({ createdAt: -1 });

export const PushNotification = model<INotification>("PushNotification", pushNotificationSchema);