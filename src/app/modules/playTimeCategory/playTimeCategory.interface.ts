import { Model } from 'mongoose';

export type IPlayTimeCategory = {
  name: string;
  slug?: string;
  status: 'active' | 'inactive';
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PlayTimeCategoryModel = Model<IPlayTimeCategory, Record<string, unknown>>;
