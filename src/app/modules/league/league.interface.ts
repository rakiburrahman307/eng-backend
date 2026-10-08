import { Types } from 'mongoose';

export interface ILeague {
  leagueName: string;
  season: string;
  ageGroup: string;

  startDate: Date;
  endDate: Date;

//   status: 'upcoming' | 'running' | 'finished';

  createdBy: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}