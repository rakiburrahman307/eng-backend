import { Types } from 'mongoose';

export interface IMatch {
  league?: Types.ObjectId | string;

  homeTeam: Types.ObjectId;

  awayTeam: Types.ObjectId;

  matchDate: Date;

  durationMinutes?: string;

  formation?: '5 v 5' | '7 v 7' | '8 v 8' | '9 v 9' | string | null;

  maxPlayersPerTeam?: number;

  venueName?: string;

  venueCategory?: Types.ObjectId | string;

  venueSubCategory?: Types.ObjectId | string;

  referee: Types.ObjectId;

  status: 'upcoming' | 'live' | 'half_time' | 'finished' | 'cancelled';

  timerStatus?: 'stopped' | 'running' | 'paused' | 'finished';

  timerStartedAt?: Date | null;

  elapsedSeconds?: number;

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