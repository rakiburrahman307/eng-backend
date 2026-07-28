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
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
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
  }
);

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
