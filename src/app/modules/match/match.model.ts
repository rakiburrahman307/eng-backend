import { Schema, model } from 'mongoose';

const matchSchema = new Schema(
  {
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

    matchDate: {
      type: Date,
      required: true,
    },

    durationMinutes: {
      type: Number,
      default: 90,
    },

    venueName: {
      type: String,
      required: true,
    },

    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['upcoming', 'live', 'finished', 'cancelled'],
      default: 'upcoming',
    },

    homeScore: {
      type: Number,
      default: 0,
    },

    awayScore: {
      type: Number,
      default: 0,
    },

    winnerTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },

    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Match = model('Match', matchSchema);