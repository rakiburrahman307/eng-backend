import { Model } from 'mongoose';

export type IVenue = {
  name: string;
  stadiumName?: string;
  city: string;
  country: string;
  capacity?: number;
  image?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
};

export type VenueModel = Model<IVenue, Record<string, unknown>>;
