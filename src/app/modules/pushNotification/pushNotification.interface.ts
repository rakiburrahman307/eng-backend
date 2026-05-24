import { Model, Types } from "mongoose";

export interface INotification {
  title: string;
  message: string;
  user?: Types.ObjectId | null;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}