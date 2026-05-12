import { Types } from 'mongoose';

export interface IMatch {
  homeTeam: Types.ObjectId;

  awayTeam: Types.ObjectId;

  matchDate: Date;

  durationMinutes: number;

  venueName: string;

  referee: Types.ObjectId;

  status: 'upcoming' | 'live' | 'finished' | 'cancelled';

  homeScore: number;

  awayScore: number;

  winnerTeam?: Types.ObjectId | null;

  notes?: string | null;
}