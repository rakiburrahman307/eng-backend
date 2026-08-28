import { Schema, model } from "mongoose";

const playerEconomySchema = new Schema(
  {
    startingMarketValue: {
      type: Number,
      default: 100000,
    },

    conversionRate: {
      type: Number,
      default: 10,
    },

    playingMatch: {
      coin: { type: Number, default: 500 },
      marketValue: { type: Number, default: 5000 },
    },

    goal: {
      coin: { type: Number, default: 2000 },
      marketValue: { type: Number, default: 20000 },
    },

    assist: {
      coin: { type: Number, default: 1000 },
      marketValue: { type: Number, default: 10000 },
    },

    cleanSheet: {
      coin: { type: Number, default: 2000 },
      marketValue: { type: Number, default: 20000 },
    },

    goodRating: {
      coin: { type: Number, default: 500 },
      marketValue: { type: Number, default: 5000 },
    },

    greatRating: {
      coin: { type: Number, default: 1500 },
      marketValue: { type: Number, default: 15000 },
    },

    eliteRating: {
      coin: { type: Number, default: 3000 },
      marketValue: { type: Number, default: 30000 },
    },

    playerOfTheDay: {
      coin: { type: Number, default: 5000 },
      marketValue: { type: Number, default: 50000 },
    },

    yellowCard: {
      coin: { type: Number, default: -500 },
      marketValue: { type: Number, default: -5000 },
    },

    sinBin: {
      coin: { type: Number, default: -2500 },
      marketValue: { type: Number, default: -25000 },
    },

    redCard: {
      coin: { type: Number, default: -5000 },
      marketValue: { type: Number, default: -50000 },
    },

    disrespectToReferee: {
      coin: { type: Number, default: -7500 },
      marketValue: { type: Number, default: -75000 },
    },

    grossMisconduct: {
      coin: { type: Number, default: -10000 },
      marketValue: { type: Number, default: -100000 },
    },

    foul: {
      coin: { type: Number, default: -100 },
      marketValue: { type: Number, default: -1000 },
    },
  },
  {
    timestamps: true,
  }
);

export const PlayerEconomy = model("PlayerEconomy", playerEconomySchema);