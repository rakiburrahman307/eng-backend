import { Model, Types } from 'mongoose';

export type INews = {
  createdBy?: Types.ObjectId | string;
  title: string;
  category: string;
  description: string;
  image: string;
  status: 'draft' | 'publish' | 'schedule';
  publishDateTime?: Date | null;
  order?: number;
  updatedAt?: Date;
};

export type NewsModel = Model<INews, Record<string, unknown>>;