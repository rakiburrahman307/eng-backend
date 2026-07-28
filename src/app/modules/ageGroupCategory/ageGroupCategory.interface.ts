import { Model } from 'mongoose';

export type IAgeGroupCategory = {
  name: string;
  slug?: string;
  status: 'active' | 'inactive';
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AgeGroupCategoryModel = Model<IAgeGroupCategory, Record<string, unknown>>;
