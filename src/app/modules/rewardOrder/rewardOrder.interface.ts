import { Types } from 'mongoose';

export interface IRewardOrder {
  user: Types.ObjectId;

  rewardProduct: Types.ObjectId;

  pointUsed: number;

  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'delivered';

  approvedBy?: Types.ObjectId | null;

  rejectReason?: string | null;

  approvedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}