import { Schema, model } from 'mongoose';
import { IEvent } from './event.interface';

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      default: null,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    publishDateTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'publish', 'schedule'],
      default: 'draft',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ order: 1 });

export const Event = model<IEvent>('Event', eventSchema);