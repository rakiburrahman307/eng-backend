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
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'EngTvCategory',
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
    isLandscape: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for subcategories
engTvCategorySchema.virtual('subCategories', {
  ref: 'EngTvCategory',
  localField: '_id',
  foreignField: 'parentCategory',
});

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

// Auto-drop legacy MongoDB single-field unique indexes if present from older schema
EngTvCategory.collection.dropIndex('name_1').catch(() => {});
EngTvCategory.collection.dropIndex('slug_1').catch(() => {});
EngTvCategory.collection.dropIndex('order_1').catch(() => {});