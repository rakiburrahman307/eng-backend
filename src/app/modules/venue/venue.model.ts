import { Schema, model } from 'mongoose';
import { IVenue, VenueModel } from './venue.interface';

const venueSchema = new Schema<IVenue, VenueModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stadiumName: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const Venue = model<IVenue, VenueModel>('Venue', venueSchema);
