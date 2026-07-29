import { Model } from 'mongoose';

export type INewsCategory = {
  name: string;
  slug?: string;
  status: 'active' | 'inactive';
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type NewsCategoryModel = Model<INewsCategory, Record<string, unknown>>;
