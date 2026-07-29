import { Schema, model } from 'mongoose';
import {
  INewsCategory,
  NewsCategoryModel,
} from './newsCategory.interface';

const newsCategorySchema = new Schema<
  INewsCategory,
  NewsCategoryModel
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
newsCategorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

export const NewsCategory = model<INewsCategory, NewsCategoryModel>(
  'NewsCategory',
  newsCategorySchema
);
