import { Types } from "mongoose";

export interface ITeamSubscription {
  user: Types.ObjectId;
  team: Types.ObjectId;
  isBellActive: boolean;
  subscribedAt: Date;
  unsubscribedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeamNotificationPayload {
  teamId: string;
  title: string;
  message: string;
  eventType?: string;
  referenceId?: string;
  referenceModel?: string;
  screen?: string;
  metadata?: Record<string, any>;
}
