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

  minute: number;

  addedBy: Types.ObjectId;
}