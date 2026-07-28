import { Schema, model } from 'mongoose';
import {
  IVenueCategory,
  VenueCategoryModel,
} from './venueCategory.interface';

const venueCategorySchema = new Schema<
  IVenueCategory,
  VenueCategoryModel
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
      ref: 'VenueCategory',
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
venueCategorySchema.virtual('subCategories', {
  ref: 'VenueCategory',
  localField: '_id',
  foreignField: 'parentCategory',
});

// Generate slug before saving
venueCategorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

export const VenueCategory = model<IVenueCategory, VenueCategoryModel>(
  'VenueCategory',
  venueCategorySchema
);
