import { Model, Types } from "mongoose";

export type INotification = {
  user: Types.ObjectId;
  title?: string;
  message?: string;
  read: boolean;
};

export type NotificationModel = Model<INotification>;