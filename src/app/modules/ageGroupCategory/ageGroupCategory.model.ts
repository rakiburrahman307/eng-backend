import { Schema, model } from 'mongoose';
import {
  IAgeGroupCategory,
  AgeGroupCategoryModel,
} from './ageGroupCategory.interface';

const ageGroupCategorySchema = new Schema<
  IAgeGroupCategory,
  AgeGroupCategoryModel
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
      ref: 'AgeGroupCategory',
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
ageGroupCategorySchema.virtual('subCategories', {
  ref: 'AgeGroupCategory',
  localField: '_id',
  foreignField: 'parentCategory',
});

// Generate slug before saving
ageGroupCategorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

export const AgeGroupCategory = model<IAgeGroupCategory, AgeGroupCategoryModel>(
  'AgeGroupCategory',
  ageGroupCategorySchema
);
