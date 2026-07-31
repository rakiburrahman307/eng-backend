import { Schema, model } from 'mongoose';

const transferSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    fromTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },

    toTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    transferType: {
      type: String,
      enum: ['FREE_AGENT', 'CLUB_TO_CLUB'],
      required: true,
    },

    status: {
      type: String,
      enum: ['PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      default: 'PENDING',
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
  },
  { timestamps: true }
);

export const Transfer = model('Transfer', transferSchema);