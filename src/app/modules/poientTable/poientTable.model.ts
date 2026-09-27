import { Schema, model } from 'mongoose';

const pointTableSchema = new Schema(
  {
    league: {
      type: Schema.Types.ObjectId,
      ref: 'League',
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    played: {
      type: Number,
      default: 0,
    },
    win: {
      type: Number,
      default: 0,
    },
    draw: {
      type: Number,
      default: 0,
    },
    loss: {
      type: Number,
      default: 0,
    },
    goalsFor: {
      type: Number,
      default: 0,
    },
    goalsAgainst: {
      type: Number,
      default: 0,
    },
    goalDifference: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    isManual: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pointTableSchema.index({ league: 1, team: 1 }, { unique: true });

export const PointTable = model('PointTable', pointTableSchema);
