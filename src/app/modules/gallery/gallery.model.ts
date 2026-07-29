import { Schema, model } from 'mongoose';
import { IGallery, GalleryModel } from './gallery.interface';

const gallerySchema = new Schema<IGallery, GalleryModel>(
  {
    image: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'GalleryCategory',
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: 'GalleryCategory',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

gallerySchema.index({ category: 1, status: 1 });
gallerySchema.index({ subCategory: 1 });
gallerySchema.index({ status: 1 });

export const Gallery = model<IGallery, GalleryModel>('Gallery', gallerySchema);
