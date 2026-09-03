import { Schema, model } from 'mongoose';

const matchEvaluationSchema = new Schema(
  {
    match: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },

    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },

    homeTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },

    awayTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },

    homeTeamRating: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    awayTeamRating: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    manOfTheMatch: {
      type: Schema.Types.ObjectId,
      ref: 'User', // player
      required: true,
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