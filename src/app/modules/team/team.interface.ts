import { Types } from 'mongoose';

export interface ITeam {
  teamName: string;
  shortName: string;
  teamLogo?: string | null;
  teamType: string;
  stadiumName: string;
  city: string;
  country: string;
  ageGroup?: string | null;
  manager?: Types.ObjectId | null;
  coin?: number;
  marketValue?: number;
}