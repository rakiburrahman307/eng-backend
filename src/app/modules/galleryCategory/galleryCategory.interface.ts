import { Model, Types } from 'mongoose';

export type IGalleryCategory = {
  name: string;
  slug?: string;
  parentCategory?: Types.ObjectId | IGalleryCategory | null;
  status: 'active' | 'inactive';
  order?: number;
  subCategories?: IGalleryCategory[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type GalleryCategoryModel = Model<IGalleryCategory, Record<string, unknown>>;
