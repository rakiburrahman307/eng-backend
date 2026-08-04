import { Schema, model } from 'mongoose';

const leagueSchema = new Schema(
  {
    leagueName: {
      type: String,
      required: true,
      trim: true,
    },

    season: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
      trim: true,
    },

    endDate: {
      type: Date,
      required: true,
      trim: true,
    },

    // status: {
    //   type: String,
    //   enum: ['upcoming', 'running', 'finished'],
    //   default: 'upcoming',
    // },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const League = model('League', leagueSchema);