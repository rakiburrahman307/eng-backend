import { Model, Types } from 'mongoose';

export type IVenueCategory = {
  name: string;
  slug?: string;
  parentCategory?: Types.ObjectId | IVenueCategory | null;
  status: 'active' | 'inactive';
  order?: number;
  subCategories?: IVenueCategory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type VenueCategoryModel = Model<IVenueCategory, Record<string, unknown>>;
