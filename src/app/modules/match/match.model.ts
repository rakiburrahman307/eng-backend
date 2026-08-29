import { Schema, model } from 'mongoose';

const matchSchema = new Schema(
  {
    league: {
      type: Schema.Types.ObjectId,
      ref: 'League',
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
    matchType: {
      type: String,
      enum: ['league', 'cup', 'friendly'],
      default: 'league',
      required: true,
    },
    ageGroup: {
      type: String,
      default: null,
    },
    ageGroupCategory: {
      type: Schema.Types.ObjectId,
      ref: 'AgeGroupCategory',
      default: null,
    },

    matchDate: {
      type: Date,
      required: true,
    },

    durationMinutes: {
      type: String,
      default: '90',
    },

    formation: {
      type: String,
      enum: ['5 v 5', '7 v 7', '8 v 8', '9 v 9'],
      default: null,
    },

    maxPlayersPerTeam: {
      type: Number,
      default: 11,
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
      required: false,
      default: null,
    },

    status: {
      type: String,
      enum: ['upcoming', 'scheduled', 'live', 'half_time', 'finished', 'cancelled'],
      default: 'upcoming',
    },

    period: {
      type: String,
      enum: ['first_half', 'second_half', null],
      default: null,
    },

    scheduledAt: {
      type: Date,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    firstHalfStartedAt: {
      type: Date,
      default: null,
    },

    halfTimeAt: {
      type: Date,
      default: null,
    },

    secondHalfStartedAt: {
      type: Date,
      default: null,
    },

    finishedAt: {
      type: Date,
      default: null,
    },

    coinAwarded: {
      type: Boolean,
      default: false,
    },

    timerStatus: {
      type: String,
      enum: ['stopped', 'running', 'paused', 'finished'],
      default: 'stopped',
    },

    timerStartedAt: {
      type: Date,
      default: null,
    },

    elapsedSeconds: {
      type: Number,
      default: 0,
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

matchSchema.index({ league: 1, status: 1 });
matchSchema.index({ matchDate: 1 });
matchSchema.index({ homeTeam: 1 });
matchSchema.index({ awayTeam: 1 });
matchSchema.index({ referee: 1 });

export const Match = model('Match', matchSchema);