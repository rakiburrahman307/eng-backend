import { Model, Types } from 'mongoose';
import { IGalleryCategory } from '../galleryCategory/galleryCategory.interface';

export type IGallery = {
  image: string;
  category?: Types.ObjectId | string | IGalleryCategory;
  subCategory?: Types.ObjectId | string | IGalleryCategory;
  status: 'active' | 'inactive';
  createdBy?: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type GalleryModel = Model<IGallery, Record<string, unknown>>;
