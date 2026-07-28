import { Schema, model } from 'mongoose';

const matchSchema = new Schema(
  {
    league: {
      type: Schema.Types.ObjectId,
      ref: 'League',
      required: true,
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
      default: '',
    },

    venueCategory: {
      type: Schema.Types.ObjectId,
      ref: 'VenueCategory',
      default: null,
    },

    venueSubCategory: {
      type: Schema.Types.ObjectId,
      ref: 'VenueCategory',
      default: null,
    },

    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['upcoming', 'live', 'half_time', 'finished', 'cancelled'],
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
    matchReview: [
      {
        team: {
          type: Schema.Types.ObjectId,
          ref: 'Team',
        },
        rating: {
          type: Number,
          min: 1,
          max: 10,
        },
        coinImpact: {
          type: Number,
          default: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Match = model('Match', matchSchema);