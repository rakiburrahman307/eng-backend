import { Model, Types } from 'mongoose';

export type IEngTvCategory = {
  name: string;
  slug?: string;
  parentCategory?: Types.ObjectId | IEngTvCategory | null;
  status: 'active' | 'inactive';
  order?: number;
  subCategories?: IEngTvCategory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type EngTvCategoryModel = Model<IEngTvCategory, Record<string, unknown>>;
