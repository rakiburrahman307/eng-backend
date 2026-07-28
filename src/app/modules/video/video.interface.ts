import { Model, Types } from 'mongoose';
import { IEngTvCategory } from '../engTvCategory/engTvCategory.interface';

export type IVideo = {
  createdBy?: Types.ObjectId | string;
  title: string;
  category: Types.ObjectId | string | IEngTvCategory;
  subCategory?: Types.ObjectId | string | IEngTvCategory;
  thumbnail?: string;
  description: string;
  videoUrl: string;
  status: 'draft' | 'publish' | 'schedule';
  publishDateTime?: Date | null;
};

export type VideoModel = Model<IVideo, Record<string, unknown>>;