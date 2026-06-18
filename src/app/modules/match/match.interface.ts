import { Types } from 'mongoose';

export interface IMatch {
  homeTeam: Types.ObjectId;

  awayTeam: Types.ObjectId;

  matchDate: Date;

  durationMinutes: number;

  venueName: string;

  referee: Types.ObjectId;

  status: 'upcoming' | 'live' | 'half_time' | 'finished' | 'cancelled';

  homeScore: number;

  awayScore: number;

  winnerTeam?: Types.ObjectId | null;
  matchReview?: {
    team?: Types.ObjectId;
    rating?: number; // 1-10
    coinImpact?: number;
    createdAt?: Date;
  }[];

  notes?: string | null;
}