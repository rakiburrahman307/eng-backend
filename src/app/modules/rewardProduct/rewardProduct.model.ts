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
    productType: {
        type: String,
        enum: ['nonCoffee', 'Coffee'],
        default: "nonCoffee"
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

    rewardToken: {
      type: String,
      default: null,
    },

    redeemedUsers: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        redeemedAt: {
          type: Date,
          default: Date.now,
        },
        points: {
          type: Number,
          default: 0,
        },
      },
    ],

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

rewardProductSchema.pre('save', function () {
  if (this.productType === 'Coffee' && !this.rewardToken) {
    this.rewardToken =
      'rp_reward_' +
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36);
  }
});

export const RewardProduct = model<IRewardProduct>(
  'RewardProduct',
  rewardProductSchema
);