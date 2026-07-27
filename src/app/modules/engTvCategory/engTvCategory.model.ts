import { Schema, model } from 'mongoose';
import {
  IEngTvCategory,
  EngTvCategoryModel,
} from './engTvCategory.interface';

const engTvCategorySchema = new Schema<
  IEngTvCategory,
  EngTvCategoryModel
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
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
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
engTvCategorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

export const EngTvCategory = model<IEngTvCategory, EngTvCategoryModel>(
  'EngTvCategory',
  engTvCategorySchema
);