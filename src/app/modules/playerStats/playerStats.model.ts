import { Schema, model } from 'mongoose';

const playerStatsSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

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

    goals: {
      type: Number,
      default: 0,
    },

    assists: {
      type: Number,
      default: 0,
    },

    cleanSheets: {
      type: Number,
      default: 0,
    },

    playerOfTheDay: {
      type: Number,
      default: 0,
    },

    minutesPlayed: {
      type: Number,
      default: 0,
    },

    yellowCards: {
      type: Number,
      default: 0,
    },

    redCards: {
      type: Number,
      default: 0,
    },

    fouls: {
      type: Number,
      default: 0,
    },

    updatedByAdmin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const PlayerStats = model('PlayerStats', playerStatsSchema);