import { Model, Types } from 'mongoose';

export type ITournamentClaim = {
  _id?: Types.ObjectId;
  tournament: Types.ObjectId;
  user: Types.ObjectId;
  claimedPosition: number;
  claimedPositionName: string;
  proofNotes?: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded?: number;
  approvedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TournamentClaimModel = Model<ITournamentClaim, Record<string, unknown>>;
