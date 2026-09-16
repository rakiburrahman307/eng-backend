import { Schema, model } from 'mongoose';
import { ClubEconomy } from '../coinAndBudget/clubEconomySchema.model';

const teamSchema = new Schema(
  {
    teamName: { type: String, required: true },
    shortName: { type: String, required: true },
    teamLogo: { type: String, default: null },
    teamType: { type: String, required: true },
    stadiumName: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    ageGroup: { type: String, default: null, index: true },
    coin: { type: Number, default: 100000 },
    marketValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

teamSchema.pre('save', async function (this: any) {
  if (this.isModified('coin') && !this.isModified('marketValue')) {
    const ce = await ClubEconomy.findOne();
    const rate = ce?.conversionRate ?? 10;
    this.marketValue = (this.coin || 0) * rate;
  }
});

export const Team = model('Team', teamSchema);