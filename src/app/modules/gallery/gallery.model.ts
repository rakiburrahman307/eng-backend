import { Schema, model } from 'mongoose';
import { IGallery, GalleryModel } from './gallery.interface';

const gallerySchema = new Schema<IGallery, GalleryModel>(
  {
    image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: 'General',
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

export const Gallery = model<IGallery, GalleryModel>('Gallery', gallerySchema);
