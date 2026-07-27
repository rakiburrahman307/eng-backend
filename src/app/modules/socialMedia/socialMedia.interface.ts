import { Model } from 'mongoose';

export type ISocialMedia = {
  platform: string; // e.g. "facebook", "instagram", "youtube", "tiktok", "x", "linkedin"
  url: string;
  icon?: string;
  status: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type SocialMediaModel = Model<ISocialMedia, Record<string, unknown>>;
