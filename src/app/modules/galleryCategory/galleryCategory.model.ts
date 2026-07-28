import { Schema, model } from 'mongoose';
import {
  IGalleryCategory,
  GalleryCategoryModel,
} from './galleryCategory.interface';

const galleryCategorySchema = new Schema<
  IGalleryCategory,
  GalleryCategoryModel
>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'GalleryCategory',
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subcategories
galleryCategorySchema.virtual('subCategories', {
  ref: 'GalleryCategory',
  localField: '_id',
  foreignField: 'parentCategory',
});

// Generate slug before saving
galleryCategorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

export const GalleryCategory = model<IGalleryCategory, GalleryCategoryModel>(
  'GalleryCategory',
  galleryCategorySchema
);
