import { Schema, model } from 'mongoose';

const teamSchema = new Schema(
  {
    teamName: {
      type: String,
      required: true,
    },

    shortName: {
      type: String,
      required: true,
        },
    teamLogo: {
      type: String,
      default: null,
    },

    teamType: {
      type: String,
      required: true,
    },

    stadiumName: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    country: {
      type: String,
      required: true,
    },

    // manager (optional user reference)
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Team = model('Team', teamSchema);