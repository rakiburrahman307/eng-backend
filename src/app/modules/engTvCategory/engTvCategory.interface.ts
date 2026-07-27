import { Model } from 'mongoose';

export type IEngTvCategory = {
  name: string; // e.g. "Highlights", "Full Matches", "Interviews", "Live Streams", "Tutorials", "News"
  slug?: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type EngTvCategoryModel = Model<IEngTvCategory, Record<string, unknown>>;
