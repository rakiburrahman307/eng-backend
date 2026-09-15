import { Schema, model } from "mongoose";

export interface IMatchSetting {
  feedbackWindowHours: number;
  isFeedbackWindowRestricted: boolean;
  timezone: string;
}

const matchSettingSchema = new Schema<IMatchSetting>(
  {
    feedbackWindowHours: {
      type: Number,
      default: 24,
      min: 0,
    },
    isFeedbackWindowRestricted: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: "Europe/London",
    },
  },
  {
    timestamps: true,
  }
);

export const MatchSetting = model<IMatchSetting>("MatchSetting", matchSettingSchema);

export const getEffectiveMatchSetting = async (): Promise<IMatchSetting> => {
  let setting = await MatchSetting.findOne();
  if (!setting) {
    setting = await MatchSetting.create({
      feedbackWindowHours: 24,
      isFeedbackWindowRestricted: true,
      timezone: "Europe/London",
    });
  }
  return setting;
};
