import { Schema, model } from "mongoose";

const clubEconomySchema = new Schema(
  {
    startingBudget: {
      type: Number,
      default: 100000,
    },

    conversionRate: {
      type: Number,
      default: 10,
    },

    attendMatch: {
      coin: { type: Number, default: 1000 },
      budgetValue: { type: Number, default: 10000 },
    },

    drawMatch: {
      coin: { type: Number, default: 2000 },
      budgetValue: { type: Number, default: 20000 },
    },

    winMatch: {
      coin: { type: Number, default: 5000 },
      budgetValue: { type: Number, default: 50000 },
    },

    exceptionalConduct: {
      coin: { type: Number, default: 2500 },
      budgetValue: { type: Number, default: 25000 },
    },

    goodConduct: {
      coin: { type: Number, default: 1500 },
      budgetValue: { type: Number, default: 15000 },
    },

    satisfactoryConduct: {
      coin: { type: Number, default: 500 },
      budgetValue: { type: Number, default: 5000 },
    },

    averageConduct: {
      coin: { type: Number, default: 0 },
      budgetValue: { type: Number, default: 0 },
    },

    poorConduct: {
      coin: { type: Number, default: -1000 },
      budgetValue: { type: Number, default: -10000 },
    },

    unprofessionalConduct: {
      coin: { type: Number, default: -3000 },
      budgetValue: { type: Number, default: -30000 },
    },
  },
  {
    timestamps: true,
  }
);

export const ClubEconomy = model("ClubEconomy", clubEconomySchema);