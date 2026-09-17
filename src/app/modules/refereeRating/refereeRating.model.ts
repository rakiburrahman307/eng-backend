import { Schema, model } from 'mongoose';

const matchEvaluationSchema = new Schema(
  {
    match: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      unique: true,
    },

    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    homeTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
    },

    awayTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
    },

    homeTeamRating: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
      default: 0,
    },

    awayTeamRating: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
      default: 0,
    },

    manOfTheMatch: {
      type: Schema.Types.ObjectId,
      ref: 'User', // player
      required: false,
      default: null,
    },

    winningTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
    },

    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export const MatchEvaluation = model('MatchEvaluation', matchEvaluationSchema);