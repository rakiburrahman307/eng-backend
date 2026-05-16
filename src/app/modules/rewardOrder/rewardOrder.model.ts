import { Schema, model } from 'mongoose';
import { IRewardOrder } from './rewardOrder.interface';

const rewardOrderSchema = new Schema<IRewardOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    rewardProduct: {
      type: Schema.Types.ObjectId,
      ref: 'RewardProduct',
      required: true,
    },

    pointUsed: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'rejected',
        'delivered',
      ],
      default: 'pending',
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    rejectReason: {
      type: String,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const RewardOrder = model<IRewardOrder>(
  'RewardOrder',
  rewardOrderSchema
);