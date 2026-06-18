import { Types } from 'mongoose';

export interface IMatchResult {
  match: Types.ObjectId;

  team: Types.ObjectId;

  player?: Types.ObjectId;

  eventType:
    | 'goal'
    | 'assist'
    | 'yellow_card'
    | 'red_card'
    | 'foul'
    | 'substitution';

  // 🔥 NEW: event details meta
  eventMeta?: {
    goalType?: 'normal' | 'penalty' | 'header' | 'own_goal' | 'free_kick';
    cardType?: 'yellow' | 'red';
    substitutionType?: 'in' | 'out';
  };

  minute: number;

  addedBy: Types.ObjectId;
}