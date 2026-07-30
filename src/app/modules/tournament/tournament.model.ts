import { Schema, model } from 'mongoose';
import { ITournament, TournamentModel } from './tournament.interface';

const positionRewardSchema = new Schema(
  {
    position: {
      type: Number,
      required: true,
    },
    positionName: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const tournamentSchema = new Schema<ITournament, TournamentModel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    banner: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    positionRewards: {
      type: [positionRewardSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'active',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

tournamentSchema.index({ status: 1 });
tournamentSchema.index({ startDate: 1, endDate: 1 });

export const Tournament = model<ITournament, TournamentModel>(
  'Tournament',
  tournamentSchema
);
