import { Model, Types } from 'mongoose';

export type IEngTvCategory = {
  name: string;
  slug?: string;
  parentCategory?: Types.ObjectId | IEngTvCategory | null;
  status: 'active' | 'inactive';
  order?: number;
  isLandscape?: boolean;
  subCategories?: IEngTvCategory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type EngTvCategoryModel = Model<IEngTvCategory, Record<string, unknown>>;
