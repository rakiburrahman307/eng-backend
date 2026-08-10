import { Schema, model } from 'mongoose';
import {
  IPlayTimeCategory,
  PlayTimeCategoryModel,
} from './playTimeCategory.interface';

const playTimeCategorySchema = new Schema<
  IPlayTimeCategory,
  PlayTimeCategoryModel
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
playTimeCategorySchema.pre('save', function () {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
  }
});

export const PlayTimeCategory = model<IPlayTimeCategory, PlayTimeCategoryModel>(
  'PlayTimeCategory',
  playTimeCategorySchema
);

// Auto-drop legacy MongoDB single-field unique indexes if present from older schema
PlayTimeCategory.collection.dropIndex('name_1').catch(() => {});
PlayTimeCategory.collection.dropIndex('slug_1').catch(() => {});
PlayTimeCategory.collection.dropIndex('order_1').catch(() => {});
