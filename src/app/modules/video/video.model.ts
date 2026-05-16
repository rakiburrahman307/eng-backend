import { model, Schema } from 'mongoose';
import { IVideo, VideoModel } from './video.interface';

const videoSchema = new Schema<IVideo, VideoModel>(
  {
    title: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },

    // 🎥 VIDEO FILE
    videoUrl: {
      type: String,
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    status: {
      type: String,
      enum: ['draft', 'publish', 'schedule'],
      default: 'publish',
    },

    publishDateTime: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const Video = model<IVideo, VideoModel>('Video', videoSchema);