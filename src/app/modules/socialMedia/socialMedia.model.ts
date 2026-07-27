import { Schema, model } from 'mongoose';
import { ISocialMedia, SocialMediaModel } from './socialMedia.interface';

const socialMediaSchema = new Schema<ISocialMedia, SocialMediaModel>(
  {
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      default: '',
    },
    status: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const SocialMedia = model<ISocialMedia, SocialMediaModel>('SocialMedia', socialMediaSchema);
