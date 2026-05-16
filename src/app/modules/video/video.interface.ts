import { Model, Types } from 'mongoose';

export type IVideo = {
  createdBy?: Types.ObjectId | string;
  title: string;
  category: string;
  description: string;
  videoUrl: string;
  status: 'draft' | 'publish' | 'schedule';
  publishDateTime?: Date | null;
};

export type VideoModel = Model<IVideo, Record<string, unknown>>;