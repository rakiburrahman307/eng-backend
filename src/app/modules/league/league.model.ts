import { Schema, model } from 'mongoose';

const leagueSchema = new Schema(
  {
    leagueName: {
      type: String,
      required: true,
    },

    season: {
      type: String,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
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