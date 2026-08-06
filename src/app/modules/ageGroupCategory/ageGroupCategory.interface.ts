import { Model, Types } from 'mongoose';

export type IAgeGroupCategory = {
  name: string;
  slug?: string;
  parentCategory?: Types.ObjectId | IAgeGroupCategory | null;
  status: 'active' | 'inactive';
  order?: number;
  subCategories?: IAgeGroupCategory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type AgeGroupCategoryModel = Model<IAgeGroupCategory, Record<string, unknown>>;
