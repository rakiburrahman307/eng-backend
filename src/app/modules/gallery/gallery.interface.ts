import { Model, Types } from 'mongoose';

export type IGallery = {
  image: string;
  category?: string;
  status: 'active' | 'inactive';
  createdBy?: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type GalleryModel = Model<IGallery, Record<string, unknown>>;
