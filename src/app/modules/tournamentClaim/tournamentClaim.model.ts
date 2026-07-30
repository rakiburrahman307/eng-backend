import { Schema, model } from 'mongoose';
import { ITournamentClaim, TournamentClaimModel } from './tournamentClaim.interface';

const tournamentClaimSchema = new Schema<ITournamentClaim, TournamentClaimModel>(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    claimedPosition: {
      type: Number,
      required: true,
    },
    claimedPositionName: {
      type: String,
      required: true,
      trim: true,
    },
    proofNotes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

tournamentClaimSchema.index({ tournament: 1, user: 1 }, { unique: true });
tournamentClaimSchema.index({ tournament: 1, claimedPosition: 1, status: 1 });

export const TournamentClaim = model<ITournamentClaim, TournamentClaimModel>(
  'TournamentClaim',
  tournamentClaimSchema
);
