import { Types } from 'mongoose';

export interface ITransfer {
  player: Types.ObjectId;

  fromTeam?: Types.ObjectId | null;

  toTeam: Types.ObjectId;

  requestedBy: Types.ObjectId;

  transferType: 'FREE_AGENT' | 'CLUB_TO_CLUB';

  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

  approvedBy?: Types.ObjectId | null;

  rejectReason?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}