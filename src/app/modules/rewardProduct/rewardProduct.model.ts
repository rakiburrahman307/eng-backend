import { Schema, model } from 'mongoose';
import { IRewardProduct } from './rewardProduct.interface';

const rewardProductSchema = new Schema<IRewardProduct>(
  {
    image: {
      type: String,
      default: null,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    point: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['publish', 'unpublish'],
      default: 'publish',
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RewardProduct = model<IRewardProduct>(
  'RewardProduct',
  rewardProductSchema
);