import { Types } from 'mongoose';

export interface ITeam {
  teamName: string;
    shortName: string;
    teamLogo?: string | null;
  teamType: string;
  stadiumName: string;
  city: string;
  country: string;
  manager?: Types.ObjectId | null;
  coin?: number;
}